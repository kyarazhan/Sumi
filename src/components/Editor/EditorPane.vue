<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useEditorStore } from "../../stores/editor";
import { useViewerStore } from "../../stores/viewer";
import { useSettingsStore } from "../../stores/settings";
import {
  applyWrap, insertLink, handleTab, handleEnter,
} from "../../composables/useEditorCommands";
import { editorToPreview } from "../../composables/syncScroll";
import EditorToolbar from "./EditorToolbar.vue";
import ModeSwitch from "./ModeSwitch.vue";

const editor = useEditorStore();
const viewer = useViewerStore();
const settings = useSettingsStore();

const ta = ref<HTMLTextAreaElement | null>(null);

// ---------- 编辑会话初始化：文档变化时载入草稿 ----------
watch(
  () => [viewer.path, settings.viewMode] as const,
  ([path, mode]) => {
    if (mode !== "read" && path && editor.path !== path) {
      editor.beginEdit(path, viewer.raw);
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (settings.viewMode !== "read" && viewer.path && editor.path !== viewer.path) {
    editor.beginEdit(viewer.path, viewer.raw);
  }
});

// ---------- 键盘 ----------
function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLTextAreaElement;
  const ctrl = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (ctrl && key === "s") {
    e.preventDefault();
    e.stopPropagation();
    void editor.save();
    return;
  }
  if (ctrl && key === "b") {
    e.preventDefault();
    e.stopPropagation();
    applyWrap(target, "**", "**", "粗体文字");
    return;
  }
  if (ctrl && key === "i") {
    e.preventDefault();
    e.stopPropagation();
    applyWrap(target, "*", "*", "斜体文字");
    return;
  }
  if (ctrl && key === "k") {
    e.preventDefault();
    e.stopPropagation();
    insertLink(target);
    return;
  }
  if (key === "tab") {
    e.preventDefault();
    handleTab(target, e.shiftKey);
    return;
  }
  if (key === "enter" && !e.shiftKey && !ctrl) {
    if (handleEnter(target)) e.preventDefault();
  }
}

// ---------- 分栏滚动同步（编辑器 → 预览；反向在 ViewerPane） ----------
function onEditorScroll() {
  editorToPreview();
}

// ---------- 状态文案 ----------
const saveChip = computed(() => {
  switch (editor.status) {
    case "saving":
      return { cls: "saving", text: "保存中…" };
    case "dirty":
      return { cls: "dirty", text: settings.editor.autoSave ? "编辑中 · 将自动保存" : "未保存" };
    case "error":
      return { cls: "error", text: "保存失败，点击重试" };
    default:
      return editor.lastSavedAt
        ? { cls: "clean", text: `已保存 ${new Date(editor.lastSavedAt).toLocaleTimeString("zh-CN", { hour12: false })}` }
        : null;
  }
});

const fontCss = computed(() => {
  switch (settings.editor.fontFamily) {
    case "sans": return "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
    case "serif": return "Georgia, 'Songti SC', SimSun, serif";
    default: return "ui-monospace, Consolas, 'Cascadia Code', 'Courier New', monospace";
  }
});
</script>

<template>
  <section class="editor-pane">
    <div class="editor-head">
      <ModeSwitch />
      <span class="ed-title" :title="viewer.path ?? ''">{{ viewer.title }}</span>
      <button
        v-if="saveChip"
        class="save-chip"
        :class="saveChip.cls"
        :title="editor.saveError ?? ''"
        @click="editor.status === 'error' && void editor.save()"
      >{{ saveChip.text }}</button>
    </div>
    <EditorToolbar :ta="ta" />
    <textarea
      ref="ta"
      class="editor-area"
      :value="editor.draft"
      :wrap="settings.editor.wrap ? 'soft' : 'off'"
      spellcheck="false"
      :style="{ fontFamily: fontCss, fontSize: settings.editor.fontSize + 'px' }"
      placeholder="开始编写 Markdown…（Ctrl+B 粗体 / Ctrl+I 斜体 / Ctrl+K 链接 / Ctrl+S 保存）"
      @input="editor.setText(($event.target as HTMLTextAreaElement).value)"
      @keydown="onKeyDown"
      @scroll="onEditorScroll"
    ></textarea>
  </section>
</template>

