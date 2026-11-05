<script setup lang="ts">
import { useUiStore } from "../../stores/ui";
import { THEME_META, useSettingsStore, type ThemeName, type Typography } from "../../stores/settings";
import { DEFAULT_RENDER_OPTIONS, type RenderOptions } from "../../api/types";
import { bridge } from "../../api/bridge";

const ui = useUiStore();
const settings = useSettingsStore();

const RENDER_LABELS: Array<{ key: keyof RenderOptions; label: string; desc: string }> = [
  { key: "highlight", label: "代码语法高亮", desc: "highlight.js" },
  { key: "math", label: "数学公式", desc: "KaTeX，$行内$ 与 $$块级$$" },
  { key: "mermaid", label: "Mermaid 图表", desc: "流程图 / 时序图 / 甘特图" },
  { key: "footnotes", label: "脚注", desc: "[^1] 语法" },
  { key: "taskLists", label: "任务列表", desc: "- [ ] 复选框" },
  { key: "anchors", label: "标题锚点", desc: "为标题生成 id，用于大纲与跳转" },
  { key: "html", label: "原始 HTML", desc: "信任文档内容时开启" },
  { key: "linkify", label: "自动链接", desc: "URL 文本自动转为链接" },
  { key: "breaks", label: "单换行成段", desc: "类 Typora / 评论区的宽松换行" },
  { key: "typographer", label: "智能标点", desc: "引号替换等排版优化" },
];

const FONT_LABELS: Array<{ id: Typography["fontFamily"]; label: string; css: string }> = [
  { id: "sans", label: "无衬线", css: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { id: "serif", label: "衬线", css: "Georgia, 'Times New Roman', 'Songti SC', SimSun, serif" },
];

function setTheme(t: ThemeName) {
  settings.setTheme(t);
}

function resetRender() {
  settings.patchRender({ ...DEFAULT_RENDER_OPTIONS });
}

function close() {
  ui.settingsOpen = false;
}

const version = __APP_VERSION__;
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="close">
      <div class="settings-panel">
        <header class="st-head">
          <h2>设置</h2>
          <button class="mini" @click="close">✕</button>
        </header>

        <section class="st-body">
          <h3>主题</h3>
          <div class="theme-grid">
            <button
              v-for="t in THEME_META"
              :key="t.id"
              class="theme-card"
              :class="{ on: settings.theme === t.id }"
              @click="setTheme(t.id)"
            >
              <span class="theme-dot" :class="{ dark: t.dark }"></span>
              {{ t.label }}
            </button>
          </div>

          <h3>排版</h3>
          <div class="st-row">
            <label>正文字体</label>
            <div class="seg">
              <button
                v-for="f in FONT_LABELS"
                :key="f.id"
                :class="{ on: settings.typography.fontFamily === f.id }"
                :style="{ fontFamily: f.css }"
                @click="settings.patchTypography({ fontFamily: f.id })"
              >{{ f.label }}</button>
            </div>
          </div>
          <div class="st-row">
            <label>字号 <b>{{ settings.typography.fontSize }}px</b></label>
            <input
              type="range" min="14" max="22" step="1"
              :value="settings.typography.fontSize"
              @input="settings.patchTypography({ fontSize: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="st-row">
            <label>行距 <b>{{ settings.typography.lineHeight.toFixed(2) }}</b></label>
            <input
              type="range" min="1.4" max="2.2" step="0.05"
              :value="settings.typography.lineHeight"
              @input="settings.patchTypography({ lineHeight: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
          <div class="st-row">
            <label>页宽 <b>{{ settings.typography.contentWidth }}px</b></label>
            <input
              type="range" min="640" max="1100" step="20"
              :value="settings.typography.contentWidth"
              @input="settings.patchTypography({ contentWidth: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>

          <h3>渲染增强 <button class="mini" @click="resetRender">恢复默认</button></h3>
          <div class="render-grid">
            <label v-for="r in RENDER_LABELS" :key="r.key" class="render-item" :title="r.desc">
              <input v-model="settings.render[r.key]" type="checkbox" />
              <span>
                <b>{{ r.label }}</b>
                <small>{{ r.desc }}</small>
              </span>
            </label>
          </div>

          <h3>关于</h3>
          <p class="about">
            墨阅 Sumi v{{ version }} · Tauri {{ bridge.desktop ? "桌面版" : "浏览器调试版" }}<br />
            渲染引擎 markdown-it + highlight.js + KaTeX + Mermaid
          </p>
        </section>
      </div>
    </div>
  </Teleport>
</template>
