/** 图片路径解析：相对路径 → 本地绝对路径 → asset 协议 URL */
export interface ImageResolveContext {
  /** 当前文档所在目录（绝对路径），浏览器 mock 为 null */
  dir: string | null;
  /** 本地绝对路径 → URL 的平台函数（asset 协议或占位） */
  fileUrl: (abs: string) => string;
}

const PASS_PREFIXES = ["http://", "https://", "data:", "blob:", "asset:", "//", "#", "mailto:"];

/** 判断是否需要本地路径解析 */
function needsResolve(src: string): boolean {
  const s = src.trim();
  if (!s) return false;
  return !PASS_PREFIXES.some((p) => s.startsWith(p)) && !s.startsWith("about:");
}

/**
 * 将 markdown 中的图片引用解析为可加载的 URL。
 * - 网络图 / data URI：原样保留
 * - 相对路径 / 绝对路径：基于当前文档目录解析为绝对路径再转 asset URL
 */
export function resolveImageUrl(src: string, ctx: ImageResolveContext): string {
  if (!needsResolve(src)) return src;
  if (!ctx.dir) return src;
  try {
    src = decodeURIComponent(src);
  } catch {
    // 保留原样（含非法百分号编码）
  }
  const cleaned = src.replace(/^\.?[\\/]/, "");
  const abs = joinPath(ctx.dir, cleaned);
  return ctx.fileUrl(abs);
}

/** 拼接路径（兼容 Windows 与 POSIX） */
function joinPath(dir: string, rel: string): string {
  const isWin = /^[a-zA-Z]:[\\/]/.test(dir) || dir.includes("\\");
  const stack = dir.split(/[\\/]/).filter(Boolean);
  for (const seg of rel.split(/[\\/]/)) {
    if (!seg || seg === ".") continue;
    if (seg === "..") stack.pop();
    else stack.push(seg);
  }
  return isWin ? stack.join("\\") : "/" + stack.join("/");
}
