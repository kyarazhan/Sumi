/** 文件树节点（前端侧统一结构） */
export interface FileNode {
  name: string;
  path: string;
  type: "dir" | "file";
  /** 仅 file：是否 Markdown 文件 */
  isMd: boolean;
  children?: FileNode[];
}

/** 全文搜索命中（与 Rust 端 SearchHit 对应） */
export interface SearchHit {
  path: string;
  title: string;
  line: number;
  snippet: string;
}

/** 书架中的一个根文件夹 */
export interface LibraryFolder {
  path: string;
  name: string;
  addedAt: number;
}

/** 最近打开记录 */
export interface RecentEntry {
  path: string;
  title: string;
  ts: number;
}

/** 阅读进度（按文档路径记忆） */
export interface ReadingProgress {
  /** 0~1 滚动比例 */
  fraction: number;
  ts: number;
}

/** TOC 条目 */
export interface TocItem {
  level: number;
  text: string;
  id: string;
}

/** 视图模式：阅读 / 分栏（左编辑右预览）/ 纯编辑 */
export type ViewMode = "read" | "split" | "edit";

/** 编辑器排版偏好 */
export interface EditorSettings {
  fontFamily: "mono" | "sans" | "serif";
  fontSize: number; // px 12 ~ 22
  wrap: boolean; // 自动换行
  autoSave: boolean; // 停止输入后自动保存
  syncScroll: boolean; // 分栏模式滚动同步
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontFamily: "mono",
  fontSize: 15,
  wrap: true,
  autoSave: true,
  syncScroll: true,
};

/** 渲染功能开关（扩展点：新增 markdown-it 插件时在此登记） */
export interface RenderOptions {
  html: boolean;
  linkify: boolean;
  breaks: boolean;
  typographer: boolean;
  highlight: boolean;
  math: boolean;
  mermaid: boolean;
  footnotes: boolean;
  taskLists: boolean;
  anchors: boolean;
}

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  html: true,
  linkify: true,
  breaks: false,
  typographer: false,
  highlight: true,
  math: true,
  mermaid: true,
  footnotes: true,
  taskLists: true,
  anchors: true,
};
