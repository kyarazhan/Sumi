<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import { bridge } from "../../api/bridge";
import type { SearchHit } from "../../api/types";
import { useUiStore } from "../../stores/ui";
import { useLibraryStore } from "../../stores/library";

const ui = useUiStore();
const library = useLibraryStore();

const q = ref("");
const hits = ref<SearchHit[]>([]);
const searching = ref(false);
const sel = ref(0);
const inputEl = ref<HTMLInputElement | null>(null);

let timer: ReturnType<typeof setTimeout> | null = null;
let seq = 0;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function hl(snippet: string): string {
  const safe = escapeHtml(snippet);
  const query = q.value.trim();
  if (!query) return safe;
  const re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return safe.replace(re, (m) => `<mark>${m}</mark>`);
}

async function run() {
  const query = q.value.trim();
  const mySeq = ++seq;
  if (!query) {
    hits.value = [];
    sel.value = 0;
    return;
  }
  searching.value = true;
  try {
    const roots = library.folders.map((f) => f.path);
    const all = await Promise.all(roots.map((r) => bridge.search(r, query, 100)));
    if (mySeq !== seq) return;
    const merged = all.flat();
    merged.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
    hits.value = merged.slice(0, 200);
    sel.value = 0;
  } catch {
    if (mySeq === seq) hits.value = [];
  } finally {
    if (mySeq === seq) searching.value = false;
  }
}

watch(q, () => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(run, 250);
});

function move(delta: number) {
  if (!hits.value.length) return;
  sel.value = (sel.value + delta + hits.value.length) % hits.value.length;
  scrollSelected();
}

function scrollSelected() {
  document.querySelector(".gs-hit.sel")?.scrollIntoView({ block: "nearest" });
}

async function openHit(i: number) {
  const h = hits.value[i];
  if (!h) return;
  ui.globalSearchOpen = false;
  await library.openFile(h.path);
}

function close() {
  ui.globalSearchOpen = false;
}

onMounted(async () => {
  await nextTick();
  inputEl.value?.focus();
});
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="close">
      <div class="gs-panel">
        <input
          ref="inputEl"
          v-model="q"
          class="gs-input"
          placeholder="在书架中搜索标题与全文…"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="openHit(sel)"
          @keydown.esc="close"
        />
        <div class="gs-meta">
          {{ searching ? "搜索中…" : hits.length ? `${hits.length} 条结果` : q ? "没有匹配" : "输入关键词开始搜索" }}
          <span class="gs-hint">↑↓ 选择 · Enter 打开 · Esc 关闭</span>
        </div>
        <div class="gs-hits">
          <div
            v-for="(h, i) in hits"
            :key="h.path + h.line"
            class="gs-hit"
            :class="{ sel: i === sel }"
            @mousemove="sel = i"
            @click="openHit(i)"
          >
            <div class="gs-title">📄 {{ h.title }} <span class="gs-line">第 {{ h.line }} 行</span></div>
            <!-- eslint-disable-next-line vue/no-v-html —— 已转义后高亮 -->
            <div class="gs-snippet" v-html="hl(h.snippet)"></div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
