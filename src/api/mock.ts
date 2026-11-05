import type { FileNode, SearchHit } from "./types";
import type { Bridge, WatchHandle } from "./bridge";
import { SAMPLE_LIBRARY, SAMPLE_ROOT, buildSampleTree } from "../samples/sampleLibrary";

/**
 * 浏览器调试桥：全部能力落在内存示例库上，
 * 让渲染/UI/搜索逻辑可以在纯浏览器环境完整走通。
 */

function toFileNode(e: {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  children?: unknown[];
}): FileNode {
  return {
    name: e.name,
    path: e.path,
    type: e.isDirectory ? "dir" : "file",
    isMd: e.isFile && /\.(md|markdown|mdown|mkd)$/i.test(e.name),
    children: e.children?.length ? (e.children as typeof e[]).map(toFileNode) : e.isDirectory ? [] : undefined,
  };
}

const noopWatch: WatchHandle = { close() {} };

export function createMockBridge(): Bridge {
  return {
    desktop: false,

    async pickFolder() {
      // 浏览器模式固定返回示例库
      return SAMPLE_ROOT;
    },

    async pickMarkdownFile() {
      return `${SAMPLE_ROOT}/README.md`;
    },

    async pickSavePath(defaultName: string) {
      return `/mock-export/${defaultName}`;
    },

    async readDirTree() {
      return buildSampleTree().map(toFileNode);
    },

    async readFileText(path: string) {
      const hit = SAMPLE_LIBRARY[path];
      if (hit === undefined) throw new Error(`mock 文档不存在: ${path}`);
      return hit;
    },

    async readBinary() {
      throw new Error("mock 模式无二进制文件");
    },

    async copyFile(src, dest) {
      SAMPLE_LIBRARY[dest] = `@copied:${src}`;
    },

    async pickImageFile() {
      return `${SAMPLE_ROOT}/assets/test-image.png`;
    },

    async writeText(path, content) {
      // 浏览器模式：写入内存（可通过 SAMPLE_LIBRARY 校验导出内容）
      SAMPLE_LIBRARY[path] = content;
    },

    async search(root: string, query: string, limit = 200): Promise<SearchHit[]> {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const hits: SearchHit[] = [];
      for (const [path, content] of Object.entries(SAMPLE_LIBRARY)) {
        if (!path.startsWith(root)) continue;
        const title = path.slice(path.lastIndexOf("/") + 1).replace(/\.(md|markdown|mdown|mkd)$/i, "");
        let count = 0;
        content.split("\n").forEach((line, idx) => {
          if (count >= 3) return;
          if (line.toLowerCase().includes(q)) {
            count += 1;
            const pos = line.toLowerCase().indexOf(q);
            const start = Math.max(0, pos - 24);
            const end = Math.min(line.length, pos + q.length + 32);
            hits.push({
              path,
              title,
              line: idx + 1,
              snippet: `${start > 0 ? "…" : ""}${line.slice(start, end)}${end < line.length ? "…" : ""}`,
            });
          }
        });
        if (hits.length >= limit) break;
      }
      hits.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
      return hits.slice(0, limit);
    },

    async openExternal(url: string) {
      window.open(url, "_blank", "noopener");
    },

    fileUrl() {
      // 浏览器模式没有真实文件，返回 1x1 占位
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23ddd'/%3E%3Ctext x='60' y='45' text-anchor='middle' fill='%23888' font-size='12'%3E图片占位%3C/text%3E%3C/svg%3E";
    },

    async watchPaths() {
      return noopWatch;
    },
  };
}
