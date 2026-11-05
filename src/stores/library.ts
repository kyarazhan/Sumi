import { defineStore } from "pinia";
import { bridge, baseName, type WatchHandle } from "../api/bridge";
import type { FileNode, LibraryFolder, RecentEntry, ReadingProgress } from "../api/types";
import { useViewerStore } from "./viewer";
import { useEditorStore } from "./editor";

const KEY = "mdr.library.v1";
const MAX_RECENT = 30;

interface LibraryState {
  folders: LibraryFolder[];
  activeFolder: string | null;
  tree: FileNode[];
  recent: RecentEntry[];
  favorites: string[];
  progress: Record<string, ReadingProgress>;
  lastPath: string | null;
  loading: boolean;
  error: string | null;
  /** 文件监听句柄（内部，不持久化） */
  _watch: WatchHandle | null;
  /** 树刷新防抖定时器 */
  _reloadTimer: ReturnType<typeof setTimeout> | null;
  /** 进度持久化节流定时器 */
  _persistTimer: ReturnType<typeof setTimeout> | null;
}

interface PersistShape {
  folders: LibraryFolder[];
  activeFolder: string | null;
  recent: RecentEntry[];
  favorites: string[];
  progress: Record<string, ReadingProgress>;
  lastPath: string | null;
}

function loadPersisted(): PersistShape {
  const empty: PersistShape = {
    folders: [],
    activeFolder: null,
    recent: [],
    favorites: [],
    progress: {},
    lastPath: null,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const saved = JSON.parse(raw) as Partial<PersistShape>;
    return {
      ...empty,
      ...saved,
      folders: saved.folders ?? empty.folders,
      recent: saved.recent ?? empty.recent,
      favorites: saved.favorites ?? empty.favorites,
      progress: saved.progress ?? empty.progress,
    };
  } catch {
    return empty;
  }
}

function stripExt(name: string): string {
  return name.replace(/\.(md|markdown|mdown|mkd)$/i, "");
}

export const useLibraryStore = defineStore("library", {
  state: (): LibraryState => ({
    tree: [],
    loading: false,
    error: null,
    _watch: null,
    _reloadTimer: null,
    _persistTimer: null,
    ...loadPersisted(),
  }),

  getters: {
    /** 当前文档是否位于书架内（决定收藏星标与库内搜索范围） */
    isDocInLibrary(state): (path: string | null) => boolean {
      return (path) =>
        !!path && state.folders.some((f) => path.toLowerCase().startsWith(f.path.toLowerCase()));
    },
    docTitle(state): (path: string) => string {
      return (path) => state.recent.find((r) => r.path === path)?.title ?? stripExt(baseName(path));
    },
  },

  actions: {
    /** main.ts 中调用一次：恢复持久化状态 + 文件监听 */
    async setup() {
      if (this.activeFolder) {
        await this.loadTree();
        this.setupWatch();
      }
      // 恢复上次阅读的文档（文件可能已被删除，失败则静默）
      if (this.lastPath) {
        const viewer = useViewerStore();
        try {
          await viewer.open(this.lastPath, { restoreProgress: true, recordRecent: false });
        } catch {
          /* 文件已不存在，忽略 */
        }
      }
    },

    persist() {
      const shape: PersistShape = {
        folders: this.folders,
        activeFolder: this.activeFolder,
        recent: this.recent,
        favorites: this.favorites,
        progress: this.progress,
        lastPath: this.lastPath,
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(shape));
      } catch {
        /* 忽略存储异常 */
      }
    },

    async addFolder(path: string) {
      if (this.folders.some((f) => f.path.toLowerCase() === path.toLowerCase())) {
        await this.setActiveFolder(path);
        return;
      }
      this.folders.push({ path, name: baseName(path), addedAt: Date.now() });
      await this.setActiveFolder(path);
      this.persist();
    },

    async removeFolder(path: string) {
      this.folders = this.folders.filter((f) => f.path !== path);
      this.favorites = this.favorites.filter((p) => !p.toLowerCase().startsWith(path.toLowerCase()));
      if (this.activeFolder?.toLowerCase() === path.toLowerCase()) {
        this.teardownWatch();
        this.activeFolder = this.folders[0]?.path ?? null;
        this.tree = [];
        if (this.activeFolder) await this.setActiveFolder(this.activeFolder);
      }
      this.persist();
    },

    async setActiveFolder(path: string) {
      this.activeFolder = path;
      await this.loadTree();
      this.setupWatch();
      this.persist();
    },

    async loadTree() {
      if (!this.activeFolder) return;
      this.loading = true;
      this.error = null;
      try {
        this.tree = await bridge.readDirTree(this.activeFolder);
      } catch (e) {
        this.error = `读取目录失败：${String(e)}`;
        this.tree = [];
      } finally {
        this.loading = false;
      }
    },

    // ---------- 文件监听（防抖 400ms） ----------
    async setupWatch() {
      this.teardownWatch();
      if (!this.activeFolder || !bridge.desktop) return;
      try {
        this._watch = await bridge.watchPaths([this.activeFolder], () => this.scheduleRefresh());
      } catch {
        // 监听失败不影响阅读
      }
    },

    teardownWatch() {
      void this._watch?.close();
      this._watch = null;
      if (this._reloadTimer) clearTimeout(this._reloadTimer);
    },

    scheduleRefresh() {
      if (this._reloadTimer) clearTimeout(this._reloadTimer);
      this._reloadTimer = setTimeout(async () => {
        const viewer = useViewerStore();
        const editor = useEditorStore();
        const openPath = viewer.path;
        // 自己刚保存的文件变化，或编辑中有未保存草稿 → 不用磁盘内容覆盖
        if (openPath && editor.shouldSuppressReload(openPath)) {
          await this.loadTree();
          return;
        }
        await this.loadTree();
        if (openPath) {
          try {
            await viewer.open(openPath, { restoreProgress: false, recordRecent: false, silent: true });
          } catch {
            /* 文件可能被删除 */
          }
        }
      }, 400);
    },

    // ---------- 打开 / 记录 ----------
    async openFile(path: string) {
      // 有未保存草稿时先落盘，再切换文档（数据安全优先）
      const editor = useEditorStore();
      if (editor.path !== path) await editor.flushIfDirty();
      const viewer = useViewerStore();
      await viewer.open(path, { restoreProgress: true });
    },

    recordRecent(path: string, title: string) {
      this.recent = [
        { path, title, ts: Date.now() },
        ...this.recent.filter((r) => r.path !== path),
      ].slice(0, MAX_RECENT);
      this.lastPath = path;
      this.persist();
    },

    toggleFavorite(path: string) {
      const idx = this.favorites.indexOf(path);
      if (idx >= 0) this.favorites.splice(idx, 1);
      else this.favorites.unshift(path);
      this.persist();
    },

    saveProgress(path: string, fraction: number) {
      if (fraction <= 0.001 || fraction >= 0.999) return;
      this.progress[path] = { fraction: Math.min(0.999, Math.max(0.001, fraction)), ts: Date.now() };
      // 节流持久化：交给定时器批量写
      if (!this._persistTimer) {
        this._persistTimer = setTimeout(() => {
          this._persistTimer = null;
          this.persist();
        }, 2000);
      }
    },
    _persistTimer: null as ReturnType<typeof setTimeout> | null,

    progressOf(path: string | null): number {
      if (!path) return 0;
      return this.progress[path]?.fraction ?? 0;
    },
  },
});
