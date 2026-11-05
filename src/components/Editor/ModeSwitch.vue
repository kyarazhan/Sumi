<script setup lang="ts">
import { useSettingsStore } from "../../stores/settings";

const settings = useSettingsStore();

const MODES: Array<{ id: "read" | "split" | "edit"; label: string; title: string }> = [
  { id: "read", label: "阅读", title: "阅读视图（仅预览）" },
  { id: "split", label: "分栏", title: "分栏视图：左侧实时预览，右侧编辑" },
  { id: "edit", label: "编辑", title: "全屏编辑视图" },
];
</script>

<template>
  <div class="mode-switch">
    <button
      v-for="m in MODES"
      :key="m.id"
      :class="{ on: settings.viewMode === m.id }"
      :title="m.title"
      @click="settings.setViewMode(m.id)"
    >{{ m.label }}</button>
  </div>
</template>
