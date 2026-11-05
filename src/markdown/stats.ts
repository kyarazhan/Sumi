/** 文档统计：字数与预估阅读时长 */

/** 提取用于统计的纯文本（剔除代码块、行内代码与 HTML 标签） */
export function plainText(src: string): string {
  return src
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " $1 ")
    .replace(/[#>*_~\-=|+]/g, " ");
}

export interface DocStats {
  /** CJK 字符数 + 西文单词数 */
  words: number;
  /** 预估阅读分钟数（中文 300字/分，西文 220词/分 的折中） */
  minutes: number;
}

export function docStats(src: string): DocStats {
  const text = plainText(src);
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
  const latinWords = (text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, " ")
    .match(/[a-zA-Z0-9]+/g) ?? []).length;
  const words = cjk + latinWords;
  const minutes = Math.max(1, Math.round(words / 260));
  return { words, minutes };
}
