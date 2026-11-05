<script setup lang="ts">
import { useViewerStore } from "../../stores/viewer";
import { useSettingsStore } from "../../stores/settings";
import type { TocItem } from "../../api/types";

const props = defineProps<{ toc: TocItem[] }>();

const viewer = useViewerStore();
const settings = useSettingsStore();

function jump(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <aside class="toc-panel">
    <div class="toc-head">
      <span>大纲</span>
      <button
        class="toc-pos"
        :title="settings.tocPosition === 'right' ? '停靠到左侧 (Ctrl+Shift+M)' : '停靠到右侧 (Ctrl+Shift+M)'"
        @click="settings.toggleTocPosition()"
      >{{ settings.tocPosition === "right" ? "‹" : "›" }}</button>
    </div>
    <div v-if="!props.toc.length" class="toc-empty">本文档没有可用的标题层级</div>
    <nav class="toc-list">
      <a
        v-for="item in props.toc"
        :key="item.id"
        class="toc-item"
        :class="[`lv${item.level}`, { active: viewer.activeHeading === item.id }]"
        :style="{ paddingLeft: `${(Math.min(item.level, 5) - 1) * 14 + 10}px` }"
        :title="item.text"
        @click="jump(item.id)"
      >{{ item.text }}</a>
    </nav>
  </aside>
</template>
