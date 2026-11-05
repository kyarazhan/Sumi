/** highlight.js 主题样式（原始 CSS）——App 注入运行时主题、导出 HTML 内联样式共用 */
import github from "highlight.js/styles/github.css?raw";
import githubDark from "highlight.js/styles/github-dark.css?raw";
import defaultLight from "highlight.js/styles/default.css?raw";
import vsDark from "highlight.js/styles/vs-dark.css?raw";
import oneDark from "highlight.js/styles/atom-one-dark.css?raw";

export const HLJS_STYLES: Record<string, string> = {
  github,
  "github-dark": githubDark,
  // highlight.js 11.9+ 已移除 solarized 主题，用相近风格替代
  "solarized-light": defaultLight,
  "solarized-dark": vsDark,
  "atom-one-dark": oneDark,
};
