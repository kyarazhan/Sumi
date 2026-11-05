/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "markdown-it-task-lists" {
  import type { PluginSimple, PluginWithOptions } from "markdown-it";
  const taskLists: PluginWithOptions<{ enabled?: boolean; label?: boolean; labelAfter?: boolean }>;
  export default taskLists;
}

declare module "markdown-it-footnote" {
  import type { PluginSimple } from "markdown-it";
  const footnotes: PluginSimple;
  export default footnotes;
}

declare module "mermaid" {
  interface MermaidApi {
    initialize(config: Record<string, unknown>): void;
    render(id: string, text: string, container?: HTMLElement): Promise<{ svg: string }>;
  }
  const mermaid: MermaidApi;
  export default mermaid;
}
