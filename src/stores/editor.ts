import { defineStore } from "pinia";
import { bridge } from "../api/bridge";
import type { TocItem } from "../api/types";
import { createEngine } from "../markdown";
import { useSettingsStore } from "./settings";
import { useViewerStore } from "./viewer";

export type SaveStatus = "clean" | "dirty" | "saving" | "error";

interface EditorState {
  /** 正在编辑的文档路径（null = 未进入编辑） */
  path: string | null;
  draft: string;
  savedContent: string;
  /** 草稿实时渲染结果（分栏预览用） */
  draftHtml: string;
  toc: TocItem[];
  saving: boolean;
  lastSavedAt: number;
  saveError: string | null;
  /** 最近一次自己保存的时间戳（文件监听回环抑制窗口） */
  lastOwnSaveAt: number;
}

const RENDER_DEBOUNCE = 200;
const AUTOSAVE_IDLE = 1500;
/** 自己保存后，忽略文件监听刷新的窗口期 */
export const OWN_SAVE_GUARD_MS = 2500;

export const useEditorStore = defineStore("editor", {
  state: (): EditorState => ({
    path: null,
    draft: "",
    savedContent: "",
    draftHtml: "",
    toc: [],
    saving: false,
    lastSavedAt: 0,
    saveError: null,
    lastOwnSaveAt: 0,
  }),

  getters: {
    dirty: (state) => state.path !== null && state.draft !== state.savedContent,
    /** 文档栏保存状态文案 */
    status(state): SaveStatus {
      if (state.saveError) return "error";
      if (state.saving) return "saving";
      return state.path === null || state.draft === state.savedContent ? "clean" : "dirty";
    },
  },

  actions: {
    /** 进入编辑：同路径保留草稿，换路径以磁盘内容为起点 */
    beginEdit(path: string, content: string) {
      if (this.path === path) return;
      this.path = path;
      this.draft = content;
      this.savedContent = content;
      this.saveError = null;
      this.renderDraftNow();
    },

    /** 草稿更新入口（textarea 每次输入调用） */
    setText(text: string) {
      this.draft = text;
      this.scheduleRender();
      this.scheduleAutosave();
    },

    // ---------- 实时预览渲染（防抖 200ms） ----------
    _renderTimer: null as ReturnType<typeof setTimeout> | null,
    scheduleRender() {
      if (this._renderTimer) clearTimeout(this._renderTimer);
      this._renderTimer = setTimeout(() => this.renderDraftNow(), RENDER_DEBOUNCE);
    },
    renderDraftNow() {
      if (this._renderTimer) {
        clearTimeout(this._renderTimer);
        this._renderTimer = null;
      }
      if (this.path === null) {
        this.draftHtml = "";
        this.toc = [];
        return;
      }
      const settings = useSettingsStore();
      const engine = createEngine({
        options: settings.render,
        imageCtx: {
          dir: this.dirOf(this.path),
          fileUrl: (abs) => bridge.fileUrl(abs),
        },
      });
      const { html, toc } = engine.render(this.draft);
      this.draftHtml = html;
      this.toc = toc;
    },
    dirOf(path: string): string {
      const norm = path.replace(/[\\/][^\\/]*$/, "");
      return norm || path;
    },

    // ---------- 保存 / 自动保存 ----------
    _saveTimer: null as ReturnType<typeof setTimeout> | null,
    scheduleAutosave() {
      if (this._saveTimer) clearTimeout(this._saveTimer);
      if (!useSettingsStore().editor.autoSave) return;
      this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        if (this.dirty) void this.save();
      }, AUTOSAVE_IDLE);
    },

    /** 立即保存（Ctrl+S / 切换文档前的兜底） */
    async save(): Promise<boolean> {
      if (this.path === null || !this.dirty || this.saving) return false;
      this.saving = true;
      this.saveError = null;
      try {
        await bridge.writeText(this.path, this.draft);
        this.savedContent = this.draft;
        this.lastSavedAt = Date.now();
        this.lastOwnSaveAt = Date.now();
        // 同步阅读视图（同一文档时），避免切回阅读模式看到旧内容
        const viewer = useViewerStore();
        if (viewer.path === this.path) {
          viewer.raw = this.draft;
          viewer.renderNow();
        }
        return true;
      } catch (e) {
        this.saveError = `保存失败：${String(e)}`;
        return false;
      } finally {
        this.saving = false;
      }
    },

    /** 切换/关闭文档前的兜底：有未保存草稿先落盘（数据安全优先于自动保存开关） */
    async flushIfDirty(): Promise<void> {
      if (this.dirty) await this.save();
    },

    /** 是否应在文件监听中忽略此路径的刷新 */
    shouldSuppressReload(path: string): boolean {
      if (this.path !== path) return false;
      if (this.dirty) return true;
      return Date.now() - this.lastOwnSaveAt < OWN_SAVE_GUARD_MS;
    },
  },
});
