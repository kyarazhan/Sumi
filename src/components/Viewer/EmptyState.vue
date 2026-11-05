<script setup lang="ts">
import { bridge, isDesktop } from "../../api/bridge";
import { useLibraryStore } from "../../stores/library";

const library = useLibraryStore();

async function addFolder() {
  const path = await bridge.pickFolder();
  if (path) await library.addFolder(path);
}

async function openSample() {
  await library.addFolder("/示例文档库");
}
</script>

<template>
  <div class="empty-state">
    <div class="es-logo">📖</div>
    <h1>墨阅</h1>
    <p class="es-sub">轻量级 Markdown 阅读器与文档库 · Sumi</p>

    <div class="es-actions">
      <button class="primary" @click="addFolder">📂 打开文件夹</button>
      <button v-if="!isDesktop" class="ghost" @click="openSample">📚 浏览示例文档库</button>
    </div>

    <div class="es-tips">
      <div><kbd>Ctrl</kbd>+<kbd>O</kbd> 添加文件夹到书架</div>
      <div><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>O</kbd> 打开单个文件</div>
      <div><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> 书架全文搜索</div>
      <div><kbd>Ctrl</kbd>+<kbd>F</kbd> 文档内搜索</div>
      <div>把文件夹拖进窗口即可加入书架</div>
    </div>
  </div>
</template>
