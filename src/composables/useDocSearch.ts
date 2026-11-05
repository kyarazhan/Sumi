import { ref, type Ref } from "vue";

/**
 * 文档内搜索（Ctrl+F）：基于 CSS Custom Highlight API 高亮，
 * 不改动 DOM，支持 Enter/Shift+Enter 循环跳转。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const cssHighlights = (CSS as any)?.highlights as Map<string, any> | undefined;
const HighlightCtor = (window as any).Highlight as any | undefined;

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "BUTTON", "CODE-COPY"]);

export function useDocSearch(container: Ref<HTMLElement | null>) {
  const visible = ref(false);
  const query = ref("");
  const count = ref(0);
  const active = ref(-1); // 0-based；-1 表示无

  let ranges: Range[] = [];

  function clearMatches() {
    ranges = [];
    count.value = 0;
    active.value = -1;
    cssHighlights?.delete("mdr-search");
    cssHighlights?.delete("mdr-search-active");
  }

  function collectTextNodes(root: Node): Text[] {
    const out: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = (node as Text).parentElement;
      const tag = parent?.tagName ?? "";
      if (!SKIP_TAGS.has(tag)) out.push(node as Text);
      node = walker.nextNode();
    }
    return out;
  }

  function search(q: string) {
    clearMatches();
    query.value = q;
    const el = container.value;
    if (!q || !el) return;
    const ql = q.toLowerCase();
    for (const textNode of collectTextNodes(el)) {
      const text = textNode.data.toLowerCase();
      let idx = text.indexOf(ql);
      while (idx !== -1 && ranges.length < 2000) {
        const r = new Range();
        r.setStart(textNode, idx);
        r.setEnd(textNode, idx + q.length);
        ranges.push(r);
        idx = text.indexOf(ql, idx + q.length);
      }
    }
    count.value = ranges.length;
    if (ranges.length) {
      if (cssHighlights && HighlightCtor) {
        cssHighlights.set("mdr-search", new HighlightCtor(...ranges));
      }
      active.value = 0;
      revealActive();
    }
  }

  function revealActive() {
    if (!cssHighlights || !HighlightCtor) return;
    const cur = ranges[active.value];
    if (!cur) {
      cssHighlights.delete("mdr-search-active");
      return;
    }
    cssHighlights.set("mdr-search-active", new HighlightCtor(cur));
    cur.startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function step(delta: number) {
    if (!count.value) return;
    active.value = (active.value + delta + count.value) % count.value;
    revealActive();
  }

  function open() {
    visible.value = true;
  }

  function close() {
    visible.value = false;
    clearMatches();
  }

  function toggle() {
    visible.value ? close() : open();
  }

  return { visible, query, count, active, search, step, open, close, toggle };
}
