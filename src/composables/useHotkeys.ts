import { onMounted, onUnmounted } from "vue";
import { useEditorStore } from "../stores/editor";

export interface HotkeyHandlers {
  openFolder(): void;
  openFile(): void;
  globalSearch(): void;
  docSearch(): void;
  printPdf(): void;
  exportHtml(): void;
  toggleSidebar(): void;
  toggleToc(): void;
  toggleTocPosition(): void;
  closeOverlay(): void;
}

/** 全局快捷键：
 *  Ctrl+O 打开文件夹 / Ctrl+Shift+O 打开文件
 *  Ctrl+F 文档内搜索 / Ctrl+Shift+F 全库搜索
 *  Ctrl+E 导出 HTML / Ctrl+P 打印为 PDF
 *  Ctrl+S 保存（编辑器聚焦时由编辑器处理）
 *  Ctrl+B 侧栏（编辑器聚焦时让位给粗体）
 *  Ctrl+M 大纲显隐 / Ctrl+Shift+M 大纲左右停靠
 *  Esc 关闭浮层
 */
export function useHotkeys(h: HotkeyHandlers) {
  const onKey = (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) {
      if (e.key === "Escape") h.closeOverlay();
      return;
    }
    const key = e.key.toLowerCase();

    // 编辑器持有焦点时，格式化快捷键优先归编辑器
    const target = e.target as HTMLElement | null;
    const inEditor = !!target && (target.tagName === "TEXTAREA" || target.isContentEditable);
    if (inEditor && ["b", "i", "k", "s"].includes(key)) return;

    if (key === "o") {
      e.preventDefault();
      e.shiftKey ? h.openFile() : h.openFolder();
    } else if (key === "f") {
      e.preventDefault();
      e.shiftKey ? h.globalSearch() : h.docSearch();
    } else if (key === "e") {
      e.preventDefault();
      h.exportHtml();
    } else if (key === "p") {
      e.preventDefault();
      h.printPdf();
    } else if (key === "b") {
      e.preventDefault();
      h.toggleSidebar();
    } else if (key === "m") {
      e.preventDefault();
      e.shiftKey ? h.toggleTocPosition() : h.toggleToc();
    } else if (key === "s") {
      e.preventDefault();
      const editor = useEditorStore();
      if (editor.path) void editor.save();
    }
  };
  onMounted(() => window.addEventListener("keydown", onKey, true));
  onUnmounted(() => window.removeEventListener("keydown", onKey, true));
}
