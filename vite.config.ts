import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import pkg from "./package.json" with { type: "json" };

// Tauri 约定：固定 1420 端口，避免环境变量泄漏进前端
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target: "chrome110",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // mermaid / katex / highlight.js 体积较大，拆分为独立 chunk 按需加载
        manualChunks: {
          mermaid: ["mermaid"],
          markdown: ["markdown-it", "highlight.js", "katex"],
          vendor: ["vue", "pinia"],
        },
      },
    },
  },
});
