<script setup lang="ts">
import {
  applyWrap, toggleLinePrefix, toggleList, insertBlock,
  insertLink, insertTable, insertCodeBlock, insertMermaid,
  insertMathInline, insertMathBlock, insertHr, insertFootnote,
  insertLocalImage, undo, redo,
} from "../../composables/useEditorCommands";
import { useEditorStore } from "../../stores/editor";
import { useViewerStore } from "../../stores/viewer";
import { useSettingsStore } from "../../stores/settings";

const props = defineProps<{ ta: HTMLTextAreaElement | null }>();

const editor = useEditorStore();
const viewer = useViewerStore();
const settings = useSettingsStore();

const FONT_OPTIONS = [
  { id: "mono", label: "等宽", css: "ui-monospace, Consolas, 'Cascadia Code', monospace" },
  { id: "sans", label: "无衬线", css: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { id: "serif", label: "衬线", css: "Georgia, 'Songti SC', SimSun, serif" },
] as const;

const SIZES = [12, 13, 14, 15, 16, 17, 18, 20, 22];

interface TBItem {
  label: string;
  title: string;
  run: () => void;
  cls?: string;
}

const TOOLBAR: Array<Array<TBItem | "sep">> = [
  [
    { label: "💾", title: "保存 (Ctrl+S)", run: () => void editor.save() },
    { label: "↶", title: "撤销 (Ctrl+Z)", run: () => props.ta && undo(props.ta) },
    { label: "↷", title: "重做 (Ctrl+Y)", run: () => props.ta && redo(props.ta) },
    "sep",
    { label: "H1", title: "一级标题", run: () => props.ta && toggleLinePrefix(props.ta, "# ") },
    { label: "H2", title: "二级标题", run: () => props.ta && toggleLinePrefix(props.ta, "## ") },
    { label: "H3", title: "三级标题", run: () => props.ta && toggleLinePrefix(props.ta, "### ") },
    "sep",
    { label: "B", title: "粗体 (Ctrl+B)", run: () => props.ta && applyWrap(props.ta, "**", "**", "粗体文字"), cls: "bold" },
    { label: "I", title: "斜体 (Ctrl+I)", run: () => props.ta && applyWrap(props.ta, "*", "*", "斜体文字"), cls: "italic" },
    { label: "S̶", title: "删除线", run: () => props.ta && applyWrap(props.ta, "~~", "~~", "删除文字") },
    { label: "`x`", title: "行内代码", run: () => props.ta && applyWrap(props.ta, "`", "`", "代码") },
    { label: "🖍", title: "高亮（HTML mark 标签）", run: () => props.ta && applyWrap(props.ta, "<mark>", "</mark>", "高亮文字") },
    "sep",
    { label: "❝", title: "引用", run: () => props.ta && toggleLinePrefix(props.ta, "> ") },
    { label: "•", title: "无序列表", run: () => props.ta && toggleList(props.ta, "ul") },
    { label: "1.", title: "有序列表", run: () => props.ta && toggleList(props.ta, "ol") },
    { label: "☑", title: "任务列表", run: () => props.ta && toggleList(props.ta, "task") },
    "sep",
    { label: "▭", title: "代码块", run: () => props.ta && insertCodeBlock(props.ta) },
    { label: "⊞", title: "表格", run: () => props.ta && insertTable(props.ta) },
    { label: "—", title: "分割线", run: () => props.ta && insertHr(props.ta) },
    { label: "[^]", title: "脚注", run: () => props.ta && insertFootnote(props.ta) },
    "sep",
    { label: "🔗", title: "链接 (Ctrl+K)", run: () => props.ta && insertLink(props.ta) },
    { label: "🖼", title: "插入本地图片（自动复制到 assets/）", run: () => props.ta && insertLocalImage(props.ta, viewer.path) },
    { label: "$x$", title: "行内公式", run: () => props.ta && insertMathInline(props.ta) },
    { label: "$$", title: "块级公式", run: () => props.ta && insertMathBlock(props.ta) },
    { label: "🧜", title: "Mermaid 图表", run: () => props.ta && insertMermaid(props.ta) },
    "sep",
    { label: "❝$…❞", title: "引用块", run: () => props.ta && insertBlock(props.ta, "> 引用内容", 1) },
  ],
];

function run(item: TBItem) {
  item.run();
}
</script>

<template>
  <div class="editor-toolbar">
    <template v-for="(group, gi) in TOOLBAR" :key="gi">
      <template v-for="(item, ii) in group" :key="gi + '-' + ii">
        <span v-if="item === 'sep'" class="tb-sep"></span>
        <button
          v-else
          class="tb-tool"
          :class="[item.cls]"
          :title="item.title"
          @mousedown.prevent
          @click="run(item)"
        >{{ item.label }}</button>
      </template>
    </template>

    <span class="tb-sep"></span>

    <select
      class="tb-select"
      title="编辑器字体"
      :value="settings.editor.fontFamily"
      @change="settings.patchEditor({ fontFamily: ($event.target as HTMLSelectElement).value as 'mono' | 'sans' | 'serif' })"
    >
      <option v-for="f in FONT_OPTIONS" :key="f.id" :value="f.id">{{ f.label }}</option>
    </select>

    <select
      class="tb-select"
      title="编辑器字号"
      :value="settings.editor.fontSize"
      @change="settings.patchEditor({ fontSize: Number(($event.target as HTMLSelectElement).value) })"
    >
      <option v-for="s in SIZES" :key="s" :value="s">{{ s }}px</option>
    </select>

    <button
      class="tb-tool toggle"
      :class="{ on: settings.editor.wrap }"
      title="自动换行"
      @click="settings.patchEditor({ wrap: !settings.editor.wrap })"
    >⏎</button>

    <button
      v-if="settings.viewMode === 'split'"
      class="tb-tool toggle"
      :class="{ on: settings.editor.syncScroll }"
      title="分栏滚动同步"
      @click="settings.patchEditor({ syncScroll: !settings.editor.syncScroll })"
    >⇅</button>

    <span class="tb-flex"></span>

    <button
      class="tb-tool toggle"
      :class="{ on: settings.editor.autoSave }"
      :title="settings.editor.autoSave ? '自动保存：开（停止输入 1.5 秒后自动保存）' : '自动保存：关'"
      @click="settings.patchEditor({ autoSave: !settings.editor.autoSave })"
    >自动保存{{ settings.editor.autoSave ? "：开" : "：关" }}</button>
  </div>
</template>
