import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readDir, readFile, readTextFile, watch } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { FileNode, SearchHit } from "./types";
import { createMockBridge } from "./mock";

export interface WatchHandle {
  close(): Promise<void> | void;
}

/**
 * 平台抽象层 —— 前端所有系统能力经由 Bridge 调用。
 * Tauri 桌面环境用真实实现；纯浏览器调试环境自动落到 mock。
 * 扩展点：新增系统能力时在此接口上扩展，mock 同步补齐。
 */
export interface Bridge {
  readonly desktop: boolean;
  pickFolder(): Promise<string | null>;
  pickMarkdownFile(): Promise<string | null>;
  pickSavePath(defaultName: string): Promise<string | null>;
  readDirTree(path: string): Promise<FileNode[]>;
  readFileText(path: string): Promise<string>;
  /** 读取二进制文件（导出 HTML 时内嵌本地图片） */
  readBinary(path: string): Promise<Uint8Array>;
  writeText(path: string, content: string): Promise<void>;
  /** 复制文件（编辑器插入图片时复制到文档 assets 目录），自动创建父目录 */
  copyFile(src: string, dest: string): Promise<void>;
  /** 选择本地图片文件（编辑器插入图片用），返回绝对路径 */
  pickImageFile(): Promise<string | null>;
  search(root: string, query: string, limit?: number): Promise<SearchHit[]>;
  openExternal(url: string): Promise<void>;
  /** 本地绝对路径 → 可嵌入 img/video 的 URL（asset 协议） */
  fileUrl(absPath: string): string;
  watchPaths(paths: string[], onChange: (paths: string[]) => void): Promise<WatchHandle>;
}

export const isDesktop = "__TAURI_INTERNALS__" in window;

const MD_EXTENSIONS = ["md", "markdown", "mdown", "mkd"];

export function isMarkdownFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MD_EXTENSIONS.includes(ext);
}

/** 从路径中提取末段名称（兼容 / 与 \） */
export function baseName(p: string): string {
  const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

/** 拼接并规范化相对路径（处理 ./ ../） */
export function joinPath(dir: string, rel: string): string {
  const isWin = /^[a-zA-Z]:[\\/]/.test(dir);
  const stack = dir.split(/[\\/]/).filter(Boolean);
  for (const seg of rel.split(/[\\/]/)) {
    if (!seg || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }
  return isWin ? stack.join("\\") : "/" + stack.join("/");
}

/** 应从文件树中隐藏的目录（依赖/构建产物） */
const IGNORED_DIRS = new Set([
  "node_modules", ".git", "target", "dist", "build", "out",
  "__pycache__", ".venv", ".idea", ".vscode", ".gradle",
]);

function sortNodes(nodes: FileNode[]): FileNode[] {
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-CN", { numeric: true });
  });
}

const tauriBridge: Bridge = {
  desktop: true,

  async pickFolder() {
    const picked = await open({ directory: true, multiple: false, title: "选择要加入书架的文件夹" });
    return typeof picked === "string" ? picked : null;
  },

  async pickMarkdownFile() {
    const picked = await open({
      multiple: false,
      title: "打开 Markdown 文件",
      filters: [{ name: "Markdown 文档", extensions: [...MD_EXTENSIONS] }],
    });
    return typeof picked === "string" ? picked : null;
  },

  async pickSavePath(defaultName: string) {
    const picked = await save({
      defaultPath: defaultName,
      filters: [{ name: "HTML 文档", extensions: ["html"] }],
    });
    return typeof picked === "string" ? picked : null;
  },

  /** 递归遍历目录（plugin-fs 的 readDir 为单层列出，此处手动递归） */
  async readDirTree(path: string): Promise<FileNode[]> {
    const walk = async (dir: string): Promise<FileNode[]> => {
      const entries = await readDir(dir);
      const nodes: FileNode[] = [];
      for (const e of entries) {
        const p = joinPath(dir, e.name);
        if (e.isDirectory) {
          if (IGNORED_DIRS.has(e.name) || e.name.startsWith(".")) continue;
          let children: FileNode[] = [];
          try {
            children = await walk(p);
          } catch {
            /* 无权限等，按空目录处理 */
          }
          nodes.push({ name: e.name, path: p, type: "dir", isMd: false, children: sortNodes(children) });
        } else if (e.isFile && isMarkdownFile(e.name)) {
          nodes.push({ name: e.name, path: p, type: "file", isMd: true });
        }
      }
      return sortNodes(nodes);
    };
    return await walk(path);
  },

  readFileText: (path: string) => readTextFile(path),

  readBinary: (path: string) => readFile(path),

  async writeText(path: string, content: string) {
    await invoke("write_text_file", { path, content });
  },

  async copyFile(src: string, dest: string) {
    await invoke("copy_file", { src, dest });
  },

  async pickImageFile() {
    const picked = await open({
      multiple: false,
      title: "插入图片",
      filters: [
        { name: "图片", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "ico"] },
      ],
    });
    return typeof picked === "string" ? picked : null;
  },

  async search(root: string, query: string, limit = 200): Promise<SearchHit[]> {
    return await invoke<SearchHit[]>("full_text_search", { root, query, limit });
  },

  openExternal: (url: string) => openUrl(url),

  fileUrl: (absPath: string) => convertFileSrc(absPath),

  async watchPaths(paths: string[], onChange: (changed: string[]) => void) {
    const unwatch = await watch(
      paths,
      (event) => {
        if (event.paths?.length) onChange(event.paths);
      },
      { recursive: true },
    );
    return { close: () => unwatch() };
  },
};

export const bridge: Bridge = isDesktop ? tauriBridge : createMockBridge();
