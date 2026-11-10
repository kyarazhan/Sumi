<script setup lang="ts">
import { ref, watch } from "vue";
import { bridge } from "../../api/bridge";
import { useLibraryStore } from "../../stores/library";
import { useViewerStore } from "../../stores/viewer";
import { relativeTime } from "../../utils/time";
import FileTree, { expandRoots } from "./FileTree.vue";

const library = useLibraryStore();
const viewer = useViewerStore();

type Tab = "files" | "fav" | "recent";
const tab = ref<Tab>("files");
const filterQ = ref("");

watch(
  () => library.tree,
  (t) => expandRoots(t.slice(0, 20)),
);

/** 过滤模式：跨整棵树匹配文件名，平铺展示 */
function collectMatches(nodes: import("../../api/types").FileNode[], q: string, out: import("../../api/types").FileNode[]) {
  for (const n of nodes) {
    if (n.type === "file" && n.name.toLowerCase().includes(q)) out.push(n);
    if (n.type === "dir" && n.children?.length) collectMatches(n.children, q, out);
  }
}

const filtered = ref<import("../../api/types").FileNode[]>([]);
watch(filterQ, (q) => {
  const query = q.trim().toLowerCase();
  if (!query) {
    filtered.value = [];
    return;
  }
  const out: import("../../api/types").FileNode[] = [];
  collectMatches(library.tree, query, out);
  filtered.value = out.slice(0, 500);
});

async function addFolder() {
  const path = await bridge.pickFolder();
  if (path) await library.addFolder(path);
}

async function openSingleFile() {
  const path = await bridge.pickMarkdownFile();
  if (path) await library.openFile(path);
}

async function removeFolder(path: string, e: Event) {
  e.stopPropagation();
  await library.removeFolder(path);
}

function starOf(path: string) {
  return library.favorites.includes(path);
}

function favToggle(path: string, e: Event) {
  e.stopPropagation();
  library.toggleFavorite(path);
}
</script>

<template>
  <aside class="sidebar">
    <div class="side-tabs">
      <button :class="{ on: tab === 'files' }" @click="tab = 'files'" title="文件树">文件</button>
      <button :class="{ on: tab === 'fav' }" @click="tab = 'fav'" title="收藏">收藏</button>
      <button :class="{ on: tab === 'recent' }" @click="tab = 'recent'" title="最近打开">最近</button>
    </div>

    <!-- 文件树 -->
    <div v-show="tab === 'files'" class="side-body">
      <div class="side-toolbar">
        <button class="mini" @click="addFolder" title="添加文件夹 (Ctrl+O)">＋ 文件夹</button>
        <button class="mini" @click="openSingleFile" title="打开单个文件 (Ctrl+Shift+O)">📄 文件</button>
        <button class="mini" @click="library.loadTree()" title="刷新目录树">⟳</button>
      </div>

      <div v-if="library.folders.length" class="folder-chips">
        <button
          v-for="f in library.folders"
          :key="f.path"
          class="chip"
          :class="{ active: f.path === library.activeFolder, missing: f.path === library.missing }"
          :title="f.path === library.missing ? `${f.path}（已不存在）` : f.path"
          @click="library.setActiveFolder(f.path)"
        >
          <span class="chip-name">{{ f.path === library.missing ? "⚠️ " : "📚 " }}{{ f.name }}</span>
          <span class="chip-x" title="从书架移除" @click="removeFolder(f.path, $event)">✕</span>
        </button>
      </div>

      <input class="side-filter" v-model="filterQ" placeholder="按文件名过滤…" />

      <div v-if="library.missing" class="side-note err">
        书架「{{ library.folders.find((f) => f.path === library.missing)?.name ?? library.missing }}」已不存在（可能被移动或删除）。<br />
        恢复原路径，或点条目上的 ✕ 移除后重新添加。
      </div>
      <div v-else-if="library.error" class="side-note err">{{ library.error }}</div>
      <div v-else-if="!library.activeFolder" class="side-note">
        书架空空如也。<br />添加一个文件夹，或直接把文件夹<b>拖进窗口</b>。
      </div>

      <div class="tree-scroll">
        <FileTree v-if="filterQ.trim()" :nodes="filtered" />
        <FileTree v-else :nodes="library.tree" />
        <div v-if="filterQ.trim() && !filtered.length" class="side-note">无匹配文件</div>
      </div>
    </div>

    <!-- 收藏 -->
    <div v-show="tab === 'fav'" class="side-body">
      <div v-if="!library.favorites.length" class="side-note">
        还没有收藏。<br />打开文档后点击标题栏的 ☆ 加入收藏。
      </div>
      <ul class="plain-list">
        <li
          v-for="p in library.favorites"
          :key="p"
          class="row"
          :class="{ active: viewer.path === p }"
          @click="library.openFile(p)"
        >
          <span class="row-ico">⭐</span>
          <span class="row-name" :title="p">{{ library.docTitle(p) }}</span>
          <span class="row-x" title="取消收藏" @click="library.toggleFavorite(p)">✕</span>
        </li>
      </ul>
    </div>

    <!-- 最近 -->
    <div v-show="tab === 'recent'" class="side-body">
      <div v-if="!library.recent.length" class="side-note">暂无打开记录。</div>
      <ul class="plain-list">
        <li
          v-for="r in library.recent"
          :key="r.path"
          class="row"
          :class="{ active: viewer.path === r.path }"
          @click="library.openFile(r.path)"
        >
          <span class="row-ico">🕒</span>
          <span class="row-main">
            <span class="row-name" :title="r.path">{{ r.title }}</span>
            <span class="row-sub">{{ relativeTime(r.ts) }}</span>
          </span>
          <span
            class="row-x"
            :class="{ on: starOf(r.path) }"
            :title="starOf(r.path) ? '取消收藏' : '收藏'"
            @click="favToggle(r.path, $event)"
          >{{ starOf(r.path) ? "★" : "☆" }}</span>
        </li>
      </ul>
    </div>
  </aside>
</template>
