/** 分栏模式滚动同步：编辑器 ⇄ 预览（双向 + 时间锁防回环） */
import { useSettingsStore } from "../stores/settings";

let lock = 0;

function armed(): boolean {
  const s = useSettingsStore();
  return s.viewMode === "split" && s.editor.syncScroll && lock === 0;
}

function hold() {
  lock++;
  setTimeout(() => {
    lock--;
  }, 60);
}

export function editorToPreview() {
  if (!armed()) return;
  const ta = document.querySelector<HTMLTextAreaElement>(".editor-area");
  const pv = document.querySelector<HTMLElement>(".viewer-scroll");
  if (!ta || !pv) return;
  hold();
  const max = ta.scrollHeight - ta.clientHeight;
  const ratio = max <= 0 ? 0 : ta.scrollTop / max;
  pv.scrollTop = ratio * (pv.scrollHeight - pv.clientHeight);
}

export function previewToEditor() {
  if (!armed()) return;
  const ta = document.querySelector<HTMLTextAreaElement>(".editor-area");
  const pv = document.querySelector<HTMLElement>(".viewer-scroll");
  if (!ta || !pv) return;
  hold();
  const max = pv.scrollHeight - pv.clientHeight;
  const ratio = max <= 0 ? 0 : pv.scrollTop / max;
  ta.scrollTop = ratio * (ta.scrollHeight - ta.clientHeight);
}
