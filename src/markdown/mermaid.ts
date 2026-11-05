/** Mermaid 块的异步渲染：markdown-it 阶段只产出占位 div，挂载后在此渲染 */

let initPromise: Promise<typeof import("mermaid")["default"]> | null = null;
let initializedTheme = "";
let seq = 0;

async function getMermaid(dark: boolean) {
  if (!initPromise) {
    initPromise = import("mermaid").then((m) => m.default);
  }
  const mermaid = await initPromise;
  const theme = dark ? "dark" : "default";
  if (initializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme,
      fontFamily:
        "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      securityLevel: "strict",
    });
    initializedTheme = theme;
  }
  return mermaid;
}

/**
 * 渲染容器内所有 .mermaid-block[data-mermaid] 占位。
 * - 成功：替换为 SVG
 * - 失败：保留源码回退块并标记错误样式
 * - 主题切换后（data-rendered 与当前主题不符）自动重渲染
 */
export async function renderMermaidBlocks(container: HTMLElement, dark: boolean) {
  const blocks = container.querySelectorAll<HTMLElement>(".mermaid-block[data-mermaid]");
  if (!blocks.length) return;
  const themeTag = dark ? "dark" : "light";
  const pending: HTMLElement[] = [];
  for (const b of blocks) {
    if (b.dataset.rendered === themeTag) continue;
    pending.push(b);
  }
  if (!pending.length) return;

  const mermaid = await getMermaid(dark);
  for (const block of pending) {
    const src = block.dataset.mermaid ?? "";
    const id = `mmd-${Date.now().toString(36)}-${seq++}`;
    try {
      const { svg } = await mermaid.render(id, src);
      block.innerHTML = svg;
      block.classList.remove("mermaid-error");
      block.dataset.rendered = themeTag;
    } catch {
      block.classList.add("mermaid-error");
      block.dataset.rendered = themeTag;
    }
  }
}
