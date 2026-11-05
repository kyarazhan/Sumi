import { useViewerStore } from "../stores/viewer";
import { useSettingsStore } from "../stores/settings";
import { bridge } from "../api/bridge";
import { HLJS_STYLES } from "../markdown/hljsStyles";

/** 支持的 asset 协议前缀（不同平台/版本形态） */
const ASSET_PREFIXES = [
  "http://asset.localhost/",
  "https://asset.localhost/",
  "asset://localhost/",
  "asset://",
];

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
};

/** 单张图片内嵌上限 */
const MAX_EMBED_BYTES = 5 * 1024 * 1024;

function toBase64(buf: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** asset URL → 本地绝对路径 */
function assetPathOf(src: string): string | null {
  for (const prefix of ASSET_PREFIXES) {
    if (src.startsWith(prefix)) {
      const rest = src.slice(prefix.length);
      try {
        return decodeURIComponent(rest).replace(/^\/([a-zA-Z]:)/, "$1");
      } catch {
        return rest;
      }
    }
  }
  return null;
}

/** 将导出 HTML 中的本地图片转 base64 内嵌（失败时保留原链接） */
async function inlineImages(html: string): Promise<string> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const src = img.getAttribute("src") ?? "";
    if (src.startsWith("data:")) continue;
    const path = assetPathOf(src);
    if (!path) continue;
    try {
      const buf = await bridge.readBinary(path);
      if (buf.byteLength > MAX_EMBED_BYTES) continue;
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
      img.setAttribute("src", `data:${mime};base64,${toBase64(buf)}`);
    } catch {
      /* 图片读取失败：保留 asset 链接 */
    }
  }
  return doc.body.innerHTML;
}

/** 从当前主题提取 CSS 变量，生成独立 HTML 的内联样式 */
function buildExportCss(): string {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  const typography = v("--md-font-family", "system-ui, sans-serif");
  const settings = useSettingsStore();
  const t = settings.typography;
  return `:root{
  --bg:${v("--bg", "#ffffff")};
  --fg:${v("--fg", "#1f2328")};
  --muted:${v("--muted", "#656d76")};
  --border:${v("--border", "#d0d7de")};
  --accent:${v("--accent", "#0969da")};
  --code-bg:${v("--code-bg", "#f6f8fa")};
  --code-border:${v("--code-border", "#d0d7de")};
  --quote-fg:${v("--quote-fg", "#656d76")};
  --mark-bg:${v("--mark-bg", "#fff8c5")};
}
body{margin:0;background:var(--bg);color:var(--fg);}
.md-export{max-width:${t.contentWidth}px;margin:0 auto;padding:48px 32px 96px;
  font-family:${typography};font-size:${t.fontSize}px;line-height:${t.lineHeight};word-wrap:break-word;}
.md-export h1,.md-export h2,.md-export h3,.md-export h4,.md-export h5,.md-export h6{line-height:1.3;margin:1.6em 0 .8em;font-weight:600;}
.md-export h1{font-size:1.9em;border-bottom:1px solid var(--border);padding-bottom:.3em;}
.md-export h2{font-size:1.45em;border-bottom:1px solid var(--border);padding-bottom:.25em;}
.md-export a{color:var(--accent);text-decoration:none;}
.md-export a:hover{text-decoration:underline;}
.md-export img{max-width:100%;}
.md-export code{font-family:ui-monospace,Consolas,'Cascadia Code',monospace;font-size:.9em;}
.md-export :not(pre)>code{background:var(--code-bg);border:1px solid var(--code-border);border-radius:4px;padding:.15em .4em;}
.md-export pre{background:var(--code-bg);border:1px solid var(--code-border);border-radius:6px;padding:14px;overflow:auto;}
.md-export pre code{background:none;border:none;padding:0;}
.md-export blockquote{margin:1em 0;padding:0 1em;color:var(--quote-fg);border-left:4px solid var(--border);}
.md-export table{border-collapse:collapse;margin:1em 0;display:block;overflow:auto;}
.md-export th,.md-export td{border:1px solid var(--border);padding:6px 13px;}
.md-export th{font-weight:600;background:var(--code-bg);}
.md-export hr{border:none;border-top:2px solid var(--border);margin:2em 0;}
.md-export mark{background:var(--mark-bg);}
.md-export .footnotes{color:var(--muted);font-size:.9em;border-top:1px solid var(--border);margin-top:2em;}
.md-export input[type=checkbox]{margin-right:.4em;}
`;
}

/**
 * 取渲染后的正文 DOM（含 Mermaid SVG 与高亮结果）作为导出内容，
 * 移除界面专属元素（复制按钮）。
 */
function captureRenderedBody(): string | null {
  const el = document.querySelector<HTMLElement>(".md-body");
  if (!el) return null;
  const clone = el.cloneNode(true) as HTMLElement;
  for (const btn of clone.querySelectorAll(".code-copy")) btn.remove();
  return clone.innerHTML;
}

export async function buildExportHtml(): Promise<string> {
  const viewer = useViewerStore();
  const settings = useSettingsStore();
  const body = await inlineImages(captureRenderedBody() ?? viewer.html);
  const hljsCss = HLJS_STYLES[settings.hljsStyleName] ?? HLJS_STYLES.github;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="generator" content="墨阅 Sumi">
<title>${viewer.title}</title>
<style>${hljsCss}</style>
<style>${buildExportCss()}</style>
</head>
<body>
<article class="md-export md-body">
${body}
</article>
</body>
</html>`;
}

/** 导出当前文档为独立 HTML（桌面：另存为；浏览器：触发下载） */
export async function exportCurrentHtml() {
  const viewer = useViewerStore();
  if (!viewer.path) return;
  const html = await buildExportHtml();
  if (bridge.desktop) {
    const target = await bridge.pickSavePath(`${viewer.title || "document"}.html`);
    if (!target) return;
    await bridge.writeText(target, html);
  } else {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${viewer.title || "document"}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

/** 打印 / 另存为 PDF（print.css 已裁掉界面元素） */
export function printCurrentPdf() {
  const viewer = useViewerStore();
  if (!viewer.path) return;
  const prev = document.title;
  document.title = viewer.title || "document";
  window.print();
  setTimeout(() => {
    document.title = prev;
  }, 500);
}
