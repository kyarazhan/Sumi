import { defineStore } from "pinia";
import { watch } from "vue";
import { DEFAULT_RENDER_OPTIONS, DEFAULT_EDITOR_SETTINGS, type RenderOptions, type EditorSettings, type ViewMode } from "../api/types";

export type ThemeName =
  | "system"
  | "github-light"
  | "github-dark"
  | "sepia"
  | "solar-light"
  | "solar-dark"
  | "one-dark";

export const THEME_META: Array<{ id: ThemeName; label: string; dark: boolean }> = [
  { id: "system", label: "跟随系统", dark: false },
  { id: "github-light", label: "GitHub 浅色", dark: false },
  { id: "github-dark", label: "GitHub 深色", dark: true },
  { id: "sepia", label: "羊皮纸", dark: false },
  { id: "solar-light", label: "Solarized 浅色", dark: false },
  { id: "solar-dark", label: "Solarized 深色", dark: true },
  { id: "one-dark", label: "One Dark", dark: true },
];

export interface Typography {
  fontFamily: "sans" | "serif";
  fontSize: number; // px
  lineHeight: number; // 1.4 ~ 2.2
  contentWidth: number; // px, 640 ~ 1100
}

interface SettingsState {
  theme: ThemeName;
  typography: Typography;
  render: RenderOptions;
  editor: EditorSettings;
  /** 阅读视图：read=仅预览 split=分栏 edit=纯编辑 */
  viewMode: ViewMode;
  /** 大纲停靠位置：right=最右（默认）/ left=阅读区左侧 */
  tocPosition: "right" | "left";
  /** system 主题下缓存的系统深色标记（由监听器更新） */
  systemDark: boolean;
}

const KEY = "mdr.settings.v1";

function load(): SettingsState {
  const base: SettingsState = {
    theme: "system",
    systemDark: window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false,
    typography: { fontFamily: "sans", fontSize: 17, lineHeight: 1.75, contentWidth: 820 },
    render: { ...DEFAULT_RENDER_OPTIONS },
    editor: { ...DEFAULT_EDITOR_SETTINGS },
    viewMode: "read",
    tocPosition: "right",
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<SettingsState>;
    return {
      ...base,
      ...saved,
      systemDark: base.systemDark,
      typography: { ...base.typography, ...saved.typography },
      render: { ...base.render, ...saved.render },
      editor: { ...base.editor, ...saved.editor },
    };
  } catch {
    return base;
  }
}

export const useSettingsStore = defineStore("settings", {
  state: load,
  getters: {
    /** 当前实际是否深色（含跟随系统解析） */
    isDark(state): boolean {
      return state.theme === "system" ? state.systemDark : THEME_META.find((t) => t.id === state.theme)?.dark ?? false;
    },
    /** 当前主题对应的 highlight.js 样式名 */
    hljsStyleName(state): string {
      const dark = state.theme === "system" ? state.systemDark : THEME_META.find((t) => t.id === state.theme)?.dark ?? false;
      switch (state.theme) {
        case "github-light": return "github";
        case "github-dark": return "github-dark";
        case "sepia": return "github";
        case "solar-light": return "default";
        case "solar-dark": return "vs-dark";
        case "one-dark": return "atom-one-dark";
        default: return dark ? "github-dark" : "github";
      }
    },
  },
  actions: {
    setTheme(theme: ThemeName) {
      this.theme = theme;
    },
    setViewMode(mode: ViewMode) {
      this.viewMode = mode;
    },
    toggleTocPosition() {
      this.tocPosition = this.tocPosition === "right" ? "left" : "right";
    },
    patchTypography(patch: Partial<Typography>) {
      Object.assign(this.typography, patch);
    },
    patchRender(patch: Partial<RenderOptions>) {
      Object.assign(this.render, patch);
    },
    patchEditor(patch: Partial<EditorSettings>) {
      Object.assign(this.editor, patch);
    },
    /** 初始化：跟随系统的监听 + 持久化（在 main.ts 调用一次） */
    setup() {
      const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
      const onSys = (e: MediaQueryListEvent) => {
        this.systemDark = e.matches;
      };
      mq?.addEventListener("change", onSys);
      watch(
        () => ({ theme: this.theme, typography: this.typography, render: this.render, editor: this.editor, viewMode: this.viewMode, tocPosition: this.tocPosition }),
        (v) => {
          try {
            localStorage.setItem(KEY, JSON.stringify(v));
          } catch {
            /* 存储满等异常忽略 */
          }
        },
        { deep: true },
      );
    },
  },
});
