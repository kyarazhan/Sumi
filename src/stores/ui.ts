import { defineStore } from "pinia";

/** 界面浮层状态（跨组件共享的开关） */
export const useUiStore = defineStore("ui", {
  state: () => ({
    sidebarOpen: true,
    tocOpen: true,
    globalSearchOpen: false,
    settingsOpen: false,
    /** 分栏模式编辑区宽度百分比（25~80） */
    splitRatio: 50,
  }),
  actions: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
    toggleToc() {
      this.tocOpen = !this.tocOpen;
    },
    toggleGlobalSearch() {
      this.globalSearchOpen = !this.globalSearchOpen;
    },
    toggleSettings() {
      this.settingsOpen = !this.settingsOpen;
    },
    closeOverlays() {
      this.globalSearchOpen = false;
      this.settingsOpen = false;
    },
  },
});
