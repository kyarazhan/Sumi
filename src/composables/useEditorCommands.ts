/**
 * 编辑器命令层：全部基于 document.execCommand('insertText')，
 * 保留 textarea 原生撤销/重做栈。
 */

type TA = HTMLTextAreaElement;

function focusTA(ta: TA) {
  if (document.activeElement !== ta) ta.focus();
}

/** 包裹选区：prefix + 选中 + suffix；已包裹时切换为取消 */
export function applyWrap(ta: TA, prefix: string, suffix: string, placeholder: string) {
  focusTA(ta);
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  const selected = ta.value.slice(s, e);
  const before = ta.value.slice(Math.max(0, s - prefix.length), s);
  const after = ta.value.slice(e, e + suffix.length);

  if (selected && before === prefix && after === suffix) {
    // 取消包裹
    ta.setSelectionRange(s - prefix.length, e + suffix.length);
    document.execCommand("insertText", false, selected);
    ta.setSelectionRange(s - prefix.length, s - prefix.length + selected.length);
    return;
  }
  const text = prefix + (selected || placeholder) + suffix;
  document.execCommand("insertText", false, text);
  if (!selected) {
    const start = s + prefix.length;
    ta.setSelectionRange(start, start + placeholder.length);
  }
}

/**
 * 行前缀切换（标题/引用/列表通用）：
 * - 该行已有目标前缀 → 移除
 * - 有其它标题前缀 → 替换（仅 heading 之间）
 * - 否则追加
 */
export function toggleLinePrefix(ta: TA, prefix: string) {
  focusTA(ta);
  const { lineStart, lineEnd } = currentLineRange(ta);
  const lines = ta.value.slice(lineStart, lineEnd).split("\n");
  const isHeading = /^#{1,6}\s$/.test(prefix);
  const changed = lines.map((line) => {
    const headingMatch = line.match(/^(#{1,6}\s+)(.*)$/);
    const body = headingMatch ? headingMatch[2] : line;
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length);
    }
    if (isHeading && headingMatch) {
      return prefix + body;
    }
    return prefix + body;
  });
  ta.setSelectionRange(lineStart, lineEnd);
  document.execCommand("insertText", false, changed.join("\n"));
  ta.setSelectionRange(lineStart, lineStart + changed.join("\n").length);
}

/** 列表三态：无序 / 有序 / 任务 */
export function toggleList(ta: TA, kind: "ul" | "ol" | "task") {
  const markers: Record<typeof kind, string> = {
    ul: "- ",
    ol: "1. ",
    task: "- [ ] ",
  };
  const removeMarkers = [/^-\s\[[ xX]\]\s?/, /^[-*+]\s?/, /^\d+\.\s?/];
  focusTA(ta);
  const { lineStart, lineEnd } = currentLineRange(ta);
  const lines = ta.value.slice(lineStart, lineEnd).split("\n");
  const target = markers[kind];
  const allHave = lines.every((l) => l.startsWith(target));
  const changed = lines.map((line) => {
    if (allHave) {
      // 全部已有目标标记 → 移除（退出列表）
      for (const re of removeMarkers) {
        if (re.test(line)) return line.replace(re, "");
      }
      return line;
    }
    // 先清掉其它列表/标题标记再加目标标记
    let body = line;
    for (const re of removeMarkers) {
      if (re.test(body)) {
        body = body.replace(re, "");
        break;
      }
    }
    body = body.replace(/^#{1,6}\s+/, "");
    return target + body;
  });
  ta.setSelectionRange(lineStart, lineEnd);
  document.execCommand("insertText", false, changed.join("\n"));
}

/** 在光标处插入块级内容，自动补空行，光标落到 offset 位置 */
export function insertBlock(ta: TA, block: string, cursorOffset?: number) {
  focusTA(ta);
  const s = ta.selectionStart;
  const before = ta.value.slice(0, s);
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const after = ta.value.slice(s);
  const tail = after === "" || after.startsWith("\n") ? "\n" : "\n\n";
  document.execCommand("insertText", false, lead + block + tail);
  if (cursorOffset !== undefined) {
    const pos = s + lead.length + cursorOffset;
    ta.setSelectionRange(pos, pos);
  }
}

/** 行内插入（行内代码 / 粗体 / 行内公式 / 脚注引用等） */
export function insertInline(ta: TA, text: string, selectFrom?: number, selectLen?: number) {
  focusTA(ta);
  const s = ta.selectionStart;
  document.execCommand("insertText", false, text);
  if (selectFrom !== undefined) {
    const a = s + selectFrom;
    ta.setSelectionRange(a, a + (selectLen ?? 0));
  }
}

export function insertLink(ta: TA) {
  insertInline(ta, "[链接文字](https://example.com)", 1, 4);
}

export function insertTable(ta: TA) {
  insertBlock(
    ta,
    "| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |",
  );
}

export function insertCodeBlock(ta: TA, lang = "") {
  insertBlock(ta, "```" + lang + "\n代码\n```", lang.length + 4);
}

export function insertMermaid(ta: TA) {
  insertBlock(
    ta,
    "```mermaid\nflowchart TD\n    A[开始] --> B[结束]\n```",
    20,
  );
}

export function insertMathInline(ta: TA) {
  insertInline(ta, "$公式$", 1, 2);
}

export function insertMathBlock(ta: TA) {
  insertBlock(ta, "$$\n公式\n$$", 3);
}

export function insertHr(ta: TA) {
  insertBlock(ta, "---");
}

export function insertFootnote(ta: TA) {
  insertInline(ta, "[^1]");
}

/**
 * 插入本地图片：选择文件 → 复制到文档旁 assets/ → 插入相对路径引用。
 * 图片已在文档目录内时直接引用，不重复复制。
 */
export async function insertLocalImage(ta: TA, docPath: string | null) {
  const { bridge, joinPath, baseName } = await import("../api/bridge");
  const picked = await bridge.pickImageFile();
  if (!picked || !docPath) return;
  const dir = docPath.replace(/[\\/][^\\/]*$/, "");
  const lower = picked.toLowerCase();
  let rel: string;
  if (lower.startsWith(dir.toLowerCase() + "\\") || lower.startsWith(dir.toLowerCase() + "/")) {
    // 已在文档目录内：直接用相对路径
    rel = picked.slice(dir.length + 1).replace(/\\/g, "/");
  } else {
    const dest = joinPath(joinPath(dir, "assets"), baseName(picked));
    await bridge.copyFile(picked, dest);
    rel = "assets/" + baseName(picked);
  }
  const encoded = rel.replace(/ /g, "%20");
  insertInline(ta, `![图片说明](${encoded})`, 2, 4);
}

/** 撤销 / 重做（textarea 原生栈） */
export function undo(ta: TA) {
  focusTA(ta);
  document.execCommand("undo");
}

export function redo(ta: TA) {
  focusTA(ta);
  document.execCommand("redo");
}

/** Tab 缩进 / Shift+Tab 反缩进；多行时整块缩进 */
export function handleTab(ta: TA, shift: boolean): boolean {
  focusTA(ta);
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  const multiLine = ta.value.slice(s, e).includes("\n");

  if (multiLine || shift) {
    const { lineStart, lineEnd } = currentLineRange(ta);
    const lines = ta.value.slice(lineStart, lineEnd).split("\n");
    const changed = lines.map((line) =>
      shift ? line.replace(/^( {1,4}|\t)/, "") : "    " + line,
    );
    ta.setSelectionRange(lineStart, lineEnd);
    document.execCommand("insertText", false, changed.join("\n"));
    return true;
  }
  if (!shift) {
    document.execCommand("insertText", false, "    ");
    return true;
  }
  return false;
}

/**
 * Enter 列表自动续行：光标在列表项末尾时生成下一项；
 * 空列表项上回车则退出列表。返回是否已处理（需 preventDefault）。
 */
export function handleEnter(ta: TA): boolean {
  const s = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf("\n", s - 1) + 1;
  const uptoCursor = ta.value.slice(lineStart, s);
  const m = uptoCursor.match(/^(\s*)([-*+]\s+|\d+\.\s+)(\[[ xX]\]\s+)?(.*)$/);
  if (!m) return false;
  focusTA(ta);
  const [, indent, marker, task, rest] = m;
  if (!rest.trim()) {
    // 空项：清掉列表标记（相当于退出列表）
    const lineEndIdx = ta.value.indexOf("\n", s);
    const lineEnd = lineEndIdx === -1 ? ta.value.length : lineEndIdx;
    ta.setSelectionRange(lineStart, lineEnd);
    document.execCommand("insertText", false, indent);
    document.execCommand("insertText", false, "\n");
    return true;
  }
  let next = marker;
  const om = marker.match(/^(\d+)\./);
  if (om) next = `${Number(om[1]) + 1}. `;
  document.execCommand("insertText", false, "\n" + indent + next + (task ? "[ ] " : ""));
  return true;
}

function currentLineRange(ta: TA): { lineStart: number; lineEnd: number } {
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  const lineStart = ta.value.lastIndexOf("\n", s - 1) + 1;
  let lineEnd = ta.value.indexOf("\n", e);
  if (lineEnd === -1) lineEnd = ta.value.length;
  return { lineStart, lineEnd };
}
