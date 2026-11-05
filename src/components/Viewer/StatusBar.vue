<script setup lang="ts">
import { computed } from "vue";
import { useViewerStore } from "../../stores/viewer";

const viewer = useViewerStore();
const pct = computed(() => Math.round((viewer.liveFraction || 0) * 100));
</script>

<template>
  <footer class="statusbar">
    <span class="sb-path" :title="viewer.path ?? ''">{{ viewer.path ?? "未打开文档 — Ctrl+O 添加文件夹" }}</span>
    <span class="sb-right" v-if="viewer.path">
      {{ viewer.stats.words }} 字 · 约 {{ viewer.stats.minutes }} 分钟 · {{ pct }}%
    </span>
  </footer>
</template>
