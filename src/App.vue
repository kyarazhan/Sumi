<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { bridge, isDesktop, isMarkdownFile, baseName } from "./api/bridge";
import { useUiStore } from "./stores/ui";
import { useSettingsStore } from "./stores/settings";
import { useLibraryStore } from "./stores/library";
import { useViewerStore } from "./stores/viewer";
import { useEditorStore } from "./stores/editor";
import { useHotkeys } from "./composables/useHotkeys";
import { exportCurrentHtml, printCurrentPdf } from "./composables/useExport";
import { DOC_SEARCH_KEY } from "./components/keys";
import TopBar from "./components/TopBar/TopBar.vue";
import SidebarPanel from "./components/Sidebar/SidebarPanel.vue";
import ViewerPane from "./components/Viewer/ViewerPane.vue";
import TocPanel from "./components/Viewer/TocPanel.vue";
import StatusBar from "./components/Viewer/StatusBar.vue";
import GlobalSearch from "./components/Search/GlobalSearch.vue";
import SettingsDialog from "./components/Dialogs/SettingsDialog.vue";
import EditorPane from "./components/Editor/EditorPane.vue";

const ui = useUiStore();
const settings = useSettingsStore();
const library = useLibraryStore();
const viewer = useViewerStore();
const editor = useEditorStore();

// ---------- 视图模式 ----------
const isSplit = computed(() => settings.viewMode === "split" && viewer.hasDoc);
const showEditor = computed(() => viewer.hasDoc && settings.viewMode !== "read");
const showViewer = computed(() => settings.viewMode === "read" || isSplit.value);
const editorStyle = computed(() => {
  if (!isSplit.value) return { flex: "1 1 auto" };
  // flex-basis 百分比的基准是 app-main 全宽，需扣除侧栏与大纲的实际占宽
  const sidebarW = ui.sidebarOpen ? 260 : 0;
  const tocW = ui.tocOpen && activeToc.value.length ? 230 : 0;
  return {
    flex: `0 0 calc((100% - ${sidebarW + tocW}px) * ${ui.splitRatio / 100})`,
    minWidth: "220px",
  };
});
/** 大纲来源：阅读模式用已保存渲染，分栏用草稿渲染 */
const activeToc = computed(() => (isSplit.value ? editor.toc : viewer.toc));

// ---------- 分栏分隔条拖拽 ----------
const mainEl = ref<HTMLElement | null>(null);
let dragging = false;

function startDividerDrag(e: MouseEvent) {
  e.preventDefault();
  dragging = true;
  window.addEventListener("mousemove", onDividerMove);
  window.addEventListener("mouseup", stopDividerDrag);
}
function onDividerMove(e: MouseEvent) {
  if (!dragging || !mainEl.value) return;
  const rect = mainEl.value.getBoundingClientRect();
  const sidebarW = ui.sidebarOpen ? 260 : 0;
  const tocW = ui.tocOpen && activeToc.value.length ? 230 : 0;
  // 与 editorStyle 的 flex-basis 保持同一基准（100% = app-main 全宽）
  const usable = rect.width - sidebarW - tocW - 5;
  if (usable <= 0) return;
  // 分栏交换后编辑栏在分隔条右侧：由右端反推编辑宽度（大纲停靠右侧时扣除其占宽）
  const rightEdge = rect.right - (settings.tocPosition === "right" ? tocW : 0);
  const ratio = ((rightEdge - e.clientX - 2.5) / usable) * 100;
  ui.splitRatio = Math.min(80, Math.max(25, Math.round(ratio)));
}
function stopDividerDrag() {
  dragging = false;
  window.removeEventListener("mousemove", onDividerMove);
  window.removeEventListener("mouseup", stopDividerDrag);
}
onUnmounted(stopDividerDrag);

// ---------- 文档内搜索触发桥 ----------
const docSearchTrigger = { set: (fn: () => void) => (openDocSearch = fn) };
let openDocSearch: () => void = () => {};
provide(DOC_SEARCH_KEY, docSearchTrigger);

// ---------- 主题与排版 ----------
const FONT_STACKS: Record<string, string> = {
  sans: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
  serif: "Georgia, 'Times New Roman', 'Songti SC', SimSun, serif",
};

const resolvedThemeId = computed(() => {
  if (settings.theme !== "system") return settings.theme;
  return settings.isDark ? "github-dark" : "github-light";
});

const rootVars = computed(() => {
  const t = settings.typography;
  return {
    "--md-font-family": FONT_STACKS[t.fontFamily],
    "--md-font-size": `${t.fontSize}px`,
    "--md-line-height": String(t.lineHeight),
    "--md-content-width": `${t.contentWidth}px`,
  };
});

watch(resolvedThemeId, (id) => {
  document.documentElement.dataset.theme = id;
  document.documentElement.dataset.dark = settings.isDark ? "true" : "false";
}, { immediate: true });

// ---------- highlight.js 主题注入（原始 CSS 字符串，单实例切换避免类冲突） ----------
import { HLJS_STYLES } from "./markdown/hljsStyles";

function applyHljsTheme() {
  let el = document.getElementById("hljs-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "hljs-theme";
    document.head.appendChild(el);
  }
  el.textContent = HLJS_STYLES[settings.hljsStyleName] ?? HLJS_STYLES.github;
}
watch(() => settings.hljsStyleName, applyHljsTheme);

// ---------- 快捷键 ----------
useHotkeys({
  openFolder: async () => {
    const path = await bridge.pickFolder();
    if (path) await library.addFolder(path);
  },
  openFile: async () => {
    const path = await bridge.pickMarkdownFile();
    if (path) await library.openFile(path);
  },
  globalSearch: () => ui.toggleGlobalSearch(),
  docSearch: () => {
    if (viewer.path) openDocSearch();
  },
  printPdf: () => printCurrentPdf(),
  exportHtml: () => void exportCurrentHtml(),
  toggleSidebar: () => ui.toggleSidebar(),
  toggleToc: () => ui.toggleToc(),
  toggleTocPosition: () => settings.toggleTocPosition(),
  closeOverlay: () => ui.closeOverlays(),
});

// ---------- 拖拽：桌面模式拖入文件夹/文件加入书架 ----------
const dragOver = ref(false);

async function handleDroppedPaths(paths: string[]) {
  for (const p of paths) {
    if (isMarkdownFile(baseName(p))) {
      await library.openFile(p);
      return;
    }
  }
  // 第一个路径不是 md 文件 → 按文件夹加入书架
  try {
    await bridge.readDirTree(paths[0]);
    await library.addFolder(paths[0]);
  } catch {
    /* 既不是可读文件夹也不是 md */
  }
}

onMounted(async () => {
  settings.setup();
  viewer.setup();
  applyHljsTheme();
  await library.setup();

  if (isDesktop) {
    const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        dragOver.value = true;
      } else if (event.payload.type === "drop") {
        dragOver.value = false;
        void handleDroppedPaths(event.payload.paths);
      } else {
        dragOver.value = false;
      }
    });
    onUnmountedQuiet(unlisten);
  } else {
    window.addEventListener("dragover", (e) => {
      e.preventDefault();
      dragOver.value = true;
    });
    window.addEventListener("dragleave", () => (dragOver.value = false));
    window.addEventListener("drop", (e) => {
      e.preventDefault();
      dragOver.value = false;
      const files = Array.from(e.dataTransfer?.files ?? []);
      for (const f of files) {
        if (isMarkdownFile(f.name)) {
          const reader = new FileReader();
          reader.onload = () => {
            viewer.openMockText(f.name, String(reader.result ?? ""));
          };
          reader.readAsText(f);
          return;
        }
      }
    });
  }
});

function onUnmountedQuiet(fn: () => void) {
  window.addEventListener("beforeunload", () => fn(), { once: true });
}
</script>

<template>
  <div class="app" :style="rootVars">
    <TopBar />
    <div ref="mainEl" class="app-main">
      <SidebarPanel v-if="ui.sidebarOpen" />
      <TocPanel v-if="ui.tocOpen && settings.tocPosition === 'left' && activeToc.length" :toc="activeToc" />
      <!-- 分栏顺序：阅读栏在左、编辑栏贴大纲一侧（大纲右停靠时编辑在最右，左停靠时阅读紧邻大纲） -->
      <ViewerPane v-show="showViewer" :preview-draft="isSplit" />
      <div v-if="isSplit" class="split-divider" @mousedown="startDividerDrag"></div>
      <EditorPane v-if="showEditor" :style="editorStyle" />
      <TocPanel v-if="ui.tocOpen && settings.tocPosition === 'right' && activeToc.length" :toc="activeToc" />
    </div>
    <StatusBar />
    <GlobalSearch v-if="ui.globalSearchOpen" />
    <SettingsDialog v-if="ui.settingsOpen" />
    <div v-if="dragOver" class="drag-mask">
      <div class="drag-box">📂 松开以加入书架</div>
    </div>
  </div>
</template>
