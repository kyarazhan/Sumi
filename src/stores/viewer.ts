import { defineStore } from "pinia";
import { watch } from "vue";
import { bridge, baseName } from "../api/bridge";
import type { TocItem } from "../api/types";
import { createEngine } from "../markdown";
import { docStats } from "../markdown/stats";
import { useSettingsStore } from "./settings";
import { useLibraryStore } from "./library";

export interface ViewerStats {
  words: number;
  minutes: number;
}

interface ViewerState {
  path: string | null;
  dir: string | null;
  title: string;
  raw: string;
  html: string;
  toc: TocItem[];
  stats: ViewerStats;
  /** 文档超过 1MB，提示可能渲染较慢 */
  bigFile: boolean;
  loading: boolean;
  error: string | null;
  /** 待恢复的滚动比例（打开文档时由 ViewerPane 消费） */
  pendingFraction: number | null;
  /** scrollspy 当前所在标题 id */
  activeHeading: string;
  /** 当前实时滚动比例（状态栏显示用） */
  liveFraction: number;
}

/** 渲染选项变化 key：变化时需要重渲染当前文档 */
export const useViewerStore = defineStore("viewer", {
  state: (): ViewerState => ({
    path: null,
    dir: null,
    title: "",
    raw: "",
    html: "",
    toc: [],
    stats: { words: 0, minutes: 0 },
    bigFile: false,
    loading: false,
    error: null,
    pendingFraction: null,
    activeHeading: "",
    liveFraction: 0,
  }),

  getters: {
    hasDoc: (state) => state.path !== null && !state.error,
  },

  actions: {
    dirOf(path: string): string {
      const norm = path.replace(/[\\/][^\\/]*$/, "");
      return norm || path;
    },

    async open(
      path: string,
      opts: { restoreProgress?: boolean; recordRecent?: boolean; silent?: boolean } = {},
    ) {
      const { restoreProgress = false, recordRecent = true, silent = false } = opts;
      const sameDoc = this.path === path;
      this.loading = !silent || !sameDoc;
      this.error = null;
      if (!sameDoc) {
        this.html = "";
        this.toc = [];
        this.title = baseName(path).replace(/\.(md|markdown|mdown|mkd)$/i, "");
      }
      try {
        const raw = await bridge.readFileText(path);
        this.path = path;
        this.dir = this.dirOf(path);
        this.raw = raw;
        this.bigFile = raw.length > 1024 * 1024;
        this.renderNow();
        if (recordRecent) {
          useLibraryStore().recordRecent(path, this.title);
        }
        // 进度恢复交给 ViewerPane 在渲染完成后执行
        this.pendingFraction = restoreProgress ? useLibraryStore().progressOf(path) : null;
        this.activeHeading = "";
      } catch (e) {
        this.error = `无法读取文档：${String(e)}`;
        if (!silent) {
          this.path = null;
          this.raw = "";
        }
      } finally {
        this.loading = false;
      }
    },

    /** 浏览器调试模式：直接打开拖入的文本内容 */
    openMockText(name: string, text: string) {
      this.path = `mock:/${name}`;
      this.dir = null;
      this.raw = text;
      this.bigFile = text.length > 1024 * 1024;
      this.title = name.replace(/\.(md|markdown|mdown|mkd)$/i, "");
      this.renderNow();
      this.pendingFraction = null;
      this.activeHeading = "";
      this.error = null;
      this.loading = false;
    },

    /** 用当前设置渲染 raw → html/toc/stats */
    renderNow() {
      if (this.path === null) return;
      const settings = useSettingsStore();
      const engine = createEngine({
        options: settings.render,
        imageCtx: { dir: this.dir, fileUrl: (abs) => bridge.fileUrl(abs) },
      });
      const { html, toc, firstHeading } = engine.render(this.raw);
      this.html = html;
      this.toc = toc;
      if (firstHeading) this.title = firstHeading;
      this.stats = docStats(this.raw);
    },

    /** main.ts 中调用：设置变化时自动重渲染 */
    setup() {
      const settings = useSettingsStore();
      watch(
        () => settings.render,
        () => {
          if (this.path) this.renderNow();
        },
        { deep: true },
      );
    },
  },
});
