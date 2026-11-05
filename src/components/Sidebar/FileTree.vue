<script lang="ts">
import { reactive } from "vue";
import type { FileNode } from "../../api/types";

/** 模块级共享的展开状态（递归实例之间保持一致） */
export const expandedDirs = reactive(new Set<string>());

export function expandRoots(nodes: FileNode[]) {
  for (const n of nodes) {
    if (n.type === "dir") expandedDirs.add(n.path);
  }
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { useViewerStore } from "../../stores/viewer";
import { useLibraryStore } from "../../stores/library";

const props = defineProps<{ nodes: FileNode[] }>();

const viewer = useViewerStore();
const library = useLibraryStore();

/** 单层最多渲染条数，超出部分折叠为“更多…” */
const CAP = 200;
const visibleNodes = computed(() => props.nodes.slice(0, CAP));
const hiddenCount = computed(() => Math.max(0, props.nodes.length - CAP));
</script>

<template>
  <ul class="file-tree">
    <li v-for="n in visibleNodes" :key="n.path">
      <div
        v-if="n.type === 'dir'"
        class="tree-row is-dir"
        :class="{ open: expandedDirs.has(n.path) }"
        @click="expandedDirs.has(n.path) ? expandedDirs.delete(n.path) : expandedDirs.add(n.path)"
      >
        <span class="chev">{{ expandedDirs.has(n.path) ? "▾" : "▸" }}</span>
        <span class="ico">📁</span>
        <span class="name" :title="n.path">{{ n.name }}</span>
      </div>
      <div
        v-else
        class="tree-row is-file"
        :class="{ active: viewer.path === n.path }"
        :title="n.path"
        @click="library.openFile(n.path)"
      >
        <span class="chev"></span>
        <span class="ico">📄</span>
        <span class="name">{{ n.name }}</span>
      </div>
      <FileTree
        v-if="n.type === 'dir' && expandedDirs.has(n.path)"
        :nodes="n.children ?? []"
      />
    </li>
    <li v-if="hiddenCount > 0" class="tree-more">… 其余 {{ hiddenCount }} 项未显示</li>
  </ul>
</template>
