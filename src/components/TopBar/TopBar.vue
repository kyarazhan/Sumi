<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useUiStore } from "../../stores/ui";
import { useLibraryStore } from "../../stores/library";
import { useViewerStore } from "../../stores/viewer";
import { THEME_META, useSettingsStore, type ThemeName } from "../../stores/settings";
import { bridge } from "../../api/bridge";
import { exportCurrentHtml, printCurrentPdf } from "../../composables/useExport";

const ui = useUiStore();
const library = useLibraryStore();
const viewer = useViewerStore();
const settings = useSettingsStore();

async function addFolder() {
  const path = await bridge.pickFolder();
  if (path) await library.addFolder(path);
}

async function openFile() {
  const path = await bridge.pickMarkdownFile();
  if (path) await library.openFile(path);
}

function setTheme(t: ThemeName) {
  settings.setTheme(t);
}

const activeFolderName = () => library.folders.find((f) => f.path === library.activeFolder)?.name ?? null;

/** 点击菜单项后收起所在 <details> 下拉 */
function closeMenu(e: Event) {
  (e.currentTarget as HTMLElement | null)?.closest("details")?.removeAttribute("open");
}

// ---------- 下拉自动收起：点击菜单以外区域立即收起；鼠标离开 2 秒后收起 ----------
function onDocClick(e: MouseEvent) {
  document.querySelectorAll<HTMLDetailsElement>("details.dd[open]").forEach((dd) => {
    if (!dd.contains(e.target as Node)) dd.removeAttribute("open");
  });
}

let closeTimer: ReturnType<typeof setTimeout> | null = null;

/** 鼠标离开展开的菜单：2 秒后自动收起 */
function armAutoClose(e: Event) {
  const dd = e.currentTarget as HTMLDetailsElement;
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (!dd.open) return;
  closeTimer = setTimeout(() => {
    closeTimer = null;
    dd.removeAttribute("open");
  }, 2000);
}

/** 鼠标移回菜单：取消收起倒计时 */
function disarmAutoClose() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
  if (closeTimer) clearTimeout(closeTimer);
});
</script>

<template>
  <header class="topbar">
    <div class="tb-left">
      <button class="tb-icon" title="收起/展开侧栏 (Ctrl+B)" @click="ui.toggleSidebar">☰</button>
      <span class="tb-title">墨阅</span>

      <details class="dd" @mouseenter="disarmAutoClose" @mouseleave="armAutoClose">
        <summary class="tb-btn">
          📚 {{ activeFolderName() ?? "选择书架" }} <span class="caret">▾</span>
        </summary>
        <div class="dd-menu">
          <div
            v-for="f in library.folders"
            :key="f.path"
            class="dd-item"
            :class="{ on: f.path === library.activeFolder }"
            :title="f.path"
            @click="closeMenu($event); library.setActiveFolder(f.path)"
          >
            <span class="dd-ico">📚</span>{{ f.name }}
          </div>
          <div v-if="library.folders.length" class="dd-sep"></div>
          <div class="dd-item" @click="addFolder">＋ 添加文件夹…</div>
          <div class="dd-item" @click="openFile">📄 打开单个文件…</div>
        </div>
      </details>
    </div>

    <div class="tb-right">
      <button
        class="tb-btn star"
        :class="{ on: viewer.path && library.favorites.includes(viewer.path) }"
        :disabled="!viewer.path || !library.isDocInLibrary(viewer.path)"
        :title="viewer.path && library.favorites.includes(viewer.path) ? '取消收藏' : '收藏当前文档'"
        @click="viewer.path && library.toggleFavorite(viewer.path)"
      >{{ viewer.path && library.favorites.includes(viewer.path) ? "★" : "☆" }}</button>

      <button class="tb-btn" title="书架全文搜索 (Ctrl+Shift+F)" @click="ui.toggleGlobalSearch">🔍</button>
      <button class="tb-btn" :class="{ on: ui.tocOpen }" title="大纲 (Ctrl+M)" @click="ui.toggleToc">📑</button>

      <details class="dd" @mouseenter="disarmAutoClose" @mouseleave="armAutoClose">
        <summary class="tb-btn" title="主题">🎨 <span class="caret">▾</span></summary>
        <div class="dd-menu right">
          <div
            v-for="t in THEME_META"
            :key="t.id"
            class="dd-item"
            :class="{ on: settings.theme === t.id }"
            @click="closeMenu($event); setTheme(t.id)"
          >
            <span class="theme-dot" :class="{ dark: t.dark }"></span>{{ t.label }}
          </div>
        </div>
      </details>

      <details class="dd" @mouseenter="disarmAutoClose" @mouseleave="armAutoClose">
        <summary class="tb-btn" title="导出">📤 导出 <span class="caret">▾</span></summary>
        <div class="dd-menu right">
          <div class="dd-item" @click="exportCurrentHtml">💾 导出 HTML… <kbd>Ctrl+E</kbd></div>
          <div class="dd-item" @click="printCurrentPdf">🖨️ 打印 / 另存为 PDF <kbd>Ctrl+P</kbd></div>
        </div>
      </details>

      <button class="tb-btn" title="设置" @click="ui.toggleSettings">⚙</button>
    </div>
  </header>
</template>
