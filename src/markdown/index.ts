import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import taskLists from "markdown-it-task-lists";
import katexPlugin from "@vscode/markdown-it-katex";
// 常用语言子集（全量语言会让包体膨胀约 1MB）
import hljs from "highlight.js/lib/common";
import type Token from "markdown-it/lib/token.mjs";
import type { RenderOptions, TocItem } from "../api/types";
import { resolveImageUrl, type ImageResolveContext } from "./images";

/**
 * Markdown 渲染引擎工厂 —— 阅读器渲染的核心扩展点。
 * 通过 RenderOptions 开关注册/停用各增强插件，新增能力只需：
 *  1. types.ts 的 RenderOptions 加开关
 *  2. 在 createEngine 中按开关 md.use(...)
 */

export interface EngineConfig {
  options: RenderOptions;
  imageCtx: ImageResolveContext;
}

export interface RenderResult {
  html: string;
  toc: TocItem[];
  /** 首个一级标题文本（用于无标题文档的展示与搜索记录） */
  firstHeading: string | null;
}

/** 中文友好的 slug：保留 CJK，空格转连字符 */
function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, "") ||
    "h"
  );
}

/**
 * 插件默认导出归一化：不同打包器对「ESM 包装的 CJS 插件」的 default
 * 解包行为不一致（如 @vscode/markdown-it-katex），统一在此收口。
 */
function asPlugin(p: unknown): unknown {
  return typeof p === "function" ? p : (p as { default: unknown }).default;
}

/**
 * 代码高亮：按 markdown-it 约定返回完整 `<pre>` 块（以 `<pre` 开头时
 * markdown-it 原样采用，避免默认渲染再包一层 `<code>` 造成嵌套）。
 */
function highlightBlock(md: MarkdownIt, code: string, lang: string): string {
  const langCls = lang ? ` language-${md.utils.escapeHtml(lang)}` : "";
  let inner: string;
  if (lang && hljs.getLanguage(lang)) {
    try {
      inner = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch {
      inner = md.utils.escapeHtml(code);
    }
  } else {
    inner = md.utils.escapeHtml(code);
  }
  return `<pre class="hljs"><code class="hljs${langCls}">${inner}</code></pre>`;
}

export function createEngine(cfg: EngineConfig) {
  const { options: o } = cfg;

  const md: MarkdownIt = new MarkdownIt({
    html: o.html,
    linkify: o.linkify,
    breaks: o.breaks,
    typographer: o.typographer,
  });

  // ---------- 代码高亮 ----------
  md.options.highlight = (code, lang) => highlightBlock(md, code, lang);

  // ---------- Mermaid 占位（挂载后异步渲染，见 mermaid.ts） ----------
  const defaultFence =
    md.renderer.rules.fence ??
    ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
  if (o.mermaid) {
    md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
      const token = tokens[idx];
      const lang = token.info.trim().split(/\s+/)[0]?.toLowerCase();
      if (lang !== "mermaid") return defaultFence(tokens, idx, opts, env, self);
      const src = md.utils.escapeHtml(token.content);
      return `<div class="mermaid-block" data-mermaid="${src}"><pre class="mermaid-fallback"><code>${src}</code></pre></div>`;
    };
  }

  // ---------- 本地图片路径重写 ----------
  const defaultImage =
    md.renderer.rules.image ??
    ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const srcIdx = token.attrIndex("src");
    if (srcIdx >= 0) {
      const raw = token.attrs![srcIdx][1];
      token.attrs![srcIdx][1] = resolveImageUrl(raw, cfg.imageCtx);
      // alt 属性可能来自 token.children（含格式），保持默认渲染即可
    }
    token.attrSet("loading", "lazy");
    token.attrJoin("class", "md-img");
    return defaultImage(tokens, idx, opts, env, self);
  };

  // ---------- 插件注册表 ----------
  if (o.anchors) {
    md.use(asPlugin(anchor) as typeof anchor, { slugify, permalink: false });
  }
  if (o.footnotes) md.use(asPlugin(footnote) as typeof footnote);
  if (o.taskLists) md.use(asPlugin(taskLists) as typeof taskLists, { label: true, enabled: true });
  if (o.math) md.use(asPlugin(katexPlugin) as typeof katexPlugin);

  // ---------- TOC 收集（依赖 anchor 生成的 id） ----------
  const toc: TocItem[] = [];
  let firstHeading: string | null = null;
  md.core.ruler.push("md_reader_toc", (state: { tokens: Token[] }) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== "heading_open") continue;
      const level = Number(t.tag.slice(1));
      const inline = tokens[i + 1];
      const text = inline?.children
        ?.filter((c) => c.type === "text" || c.type === "code_inline")
        .map((c) => c.content)
        .join("") ?? "";
      const id = t.attrGet("id") ?? "";
      toc.push({ level, text, id });
      if (firstHeading === null && text) firstHeading = text;
    }
  });

  return {
    render(src: string): RenderResult {
      toc.length = 0;
      firstHeading = null;
      const html = md.render(src);
      return { html, toc: [...toc], firstHeading };
    },
  };
}
