<script setup lang="ts">
import { computed, inject, nextTick, ref, watch, onBeforeUnmount } from "vue";
import { bridge, joinPath } from "../../api/bridge";
import { useViewerStore } from "../../stores/viewer";
import { useLibraryStore } from "../../stores/library";
import { useSettingsStore } from "../../stores/settings";
import { useEditorStore } from "../../stores/editor";
import { renderMermaidBlocks } from "../../markdown/mermaid";
import { useDocSearch } from "../../composables/useDocSearch";
import { previewToEditor } from "../../composables/syncScroll";
import { DOC_SEARCH_KEY } from "../keys";
import EmptyState from "./EmptyState.vue";
import ModeSwitch from "../Editor/ModeSwitch.vue";

const props = defineProps<{
  /** 分栏模式：预览渲染编辑器草稿而非已保存内容 */
  previewDraft?: boolean;
}>();

const viewer = useViewerStore();
const library = useLibraryStore();
const settings = useSettingsStore();
const editor = useEditorStore();

const scrollEl = ref<HTMLElement | null>(null);
const bodyEl = ref<HTMLElement | null>(null);

/** 渲染源：阅读模式用已保存内容，分栏模式用编辑器草稿 */
const previewHtml = computed(() => (props.previewDraft ? editor.draftHtml : viewer.html));

// ---------- 文档内搜索（Ctrl+F），App 通过 inject 触发 ----------
const ds = useDocSearch(bodyEl);
const dsInput = ref<HTMLInputElement | null>(null);
watch(ds.visible, async (v) => {
  if (v) {
    await nextTick();
    dsInput.value?.focus();
    ds.search(ds.query.value);
  }
});
provideDocSearch();
function provideDocSearch() {
  const api = inject(DOC_SEARCH_KEY);
  if (!api) return;
  api.set(ds.open);
}

// ---------- 渲染后处理：复制按钮 / mermaid / spy；滚动仅在换文档时重置 ----------
let spy: IntersectionObserver | null = null;
let lastRenderedPath: string | null = null;

watch(
  previewHtml,
  async () => {
    await nextTick();
    const el = bodyEl.value;
    if (!el) return;
    injectCopyButtons(el);
    void renderMermaidBlocks(el, settings.isDark);
    setupSpy(el);
    // 仅在切换文档时重置/恢复滚动，避免分栏输入时预览位置跳动
    if (viewer.path !== lastRenderedPath) {
      restoreScroll();
      lastRenderedPath = viewer.path;
    }
  },
);

watch(
  () => viewer.path,
  () => {
    ds.close();
  },
);

function injectCopyButtons(root: HTMLElement) {
  for (const code of root.querySelectorAll<HTMLElement>("pre > code")) {
    const pre = code.parentElement!;
    if (pre.querySelector(".code-copy")) continue;
    const btn = document.createElement("button");
    btn.className = "code-copy";
    btn.type = "button";
    btn.textContent = "复制";
    pre.appendChild(btn);
  }
}

function setupSpy(root: HTMLElement) {
  spy?.disconnect();
  viewer.activeHeading = "";
  spy = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          viewer.activeHeading = en.target.id;
        }
      }
    },
    { root: scrollEl.value, rootMargin: "-8% 0px -82% 0px", threshold: 0 },
  );
  for (const h of root.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")) {
    spy.observe(h);
  }
}

function restoreScroll() {
  const el = scrollEl.value;
  if (!el) return;
  if (viewer.pendingFraction != null) {
    const f = viewer.pendingFraction;
    viewer.pendingFraction = null;
    requestAnimationFrame(() => {
      el.scrollTop = f * (el.scrollHeight - el.clientHeight);
    });
  } else {
    el.scrollTop = 0;
  }
}

onBeforeUnmount(() => spy?.disconnect());

// ---------- 滚动：阅读模式记忆进度；分栏模式同步到编辑器 ----------
let scrollRaf = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function onScroll() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    const el = scrollEl.value;
    if (!el || !viewer.path) return;
    if (props.previewDraft) {
      previewToEditor();
      return;
    }
    const max = el.scrollHeight - el.clientHeight;
    const fraction = max <= 0 ? 1 : el.scrollTop / max;
    viewer.liveFraction = fraction;
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (viewer.path) library.saveProgress(viewer.path, fraction);
    }, 500);
  });
}

// ---------- 链接与复制按钮点击委托 ----------
async function onArticleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;

  if (target.classList.contains("code-copy")) {
    const code = target.closest("pre")?.querySelector("code");
    if (code) {
      try {
        await navigator.clipboard.writeText(code.textContent ?? "");
        target.textContent = "已复制 ✓";
        setTimeout(() => (target.textContent = "复制"), 1200);
      } catch {
        target.textContent = "复制失败";
      }
    }
    return;
  }

  const a = target.closest("a") as HTMLAnchorElement | null;
  if (!a) return;
  const href = a.getAttribute("href") ?? "";

  if (href.startsWith("#")) {
    e.preventDefault();
    const id = decodeURIComponent(href.slice(1));
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (/^https?:\/\//i.test(href)) {
    e.preventDefault();
    await bridge.openExternal(href);
    return;
  }

  // 相对 .md 链接 → 跳转到库内文档
  const clean = href.split("#")[0];
  if (/\.(md|markdown|mdown|mkd)$/i.test(clean) && viewer.dir) {
    e.preventDefault();
    let rel = clean;
    try {
      rel = decodeURIComponent(clean);
    } catch {
      /* keep */
    }
    const abs = joinPath(viewer.dir, rel);
    await library.openFile(abs);
  }
}
</script>

<template>
  <section class="viewer-pane">
    <div v-if="viewer.hasDoc && !previewDraft" class="doc-bar">
      <span class="doc-title" :title="viewer.path ?? ''">{{ viewer.title }}</span>
      <span v-if="viewer.bigFile" class="doc-big">大文件 · 渲染可能稍慢</span>
      <ModeSwitch />
      <span class="doc-path" :title="viewer.path ?? ''">{{ viewer.path }}</span>
    </div>

    <div v-if="ds.visible.value" class="doc-search">
      <input
        ref="dsInput"
        v-model="ds.query.value"
        placeholder="在本文档中搜索…"
        @input="ds.search(ds.query.value)"
        @keydown.enter.prevent="ds.step($event.shiftKey ? -1 : 1)"
        @keydown.esc="ds.close()"
      />
      <span class="ds-count">{{ ds.count.value ? `${ds.active.value + 1} / ${ds.count.value}` : "无结果" }}</span>
      <button class="mini" title="上一个 (Shift+Enter)" @click="ds.step(-1)">↑</button>
      <button class="mini" title="下一个 (Enter)" @click="ds.step(1)">↓</button>
      <button class="mini" title="关闭 (Esc)" @click="ds.close()">✕</button>
    </div>

    <div ref="scrollEl" class="viewer-scroll" @scroll="onScroll">
      <EmptyState v-if="!viewer.path && !viewer.loading" />
      <div v-else-if="viewer.loading" class="viewer-loading">加载中…</div>
      <div v-else-if="viewer.error" class="viewer-error">{{ viewer.error }}</div>
      <!-- eslint-disable-next-line vue/no-v-html —— 内容来自用户本地文档 -->
      <article
        v-else
        ref="bodyEl"
        class="md-body"
        v-html="previewHtml"
        @click="onArticleClick"
      ></article>
    </div>
  </section>
</template>
