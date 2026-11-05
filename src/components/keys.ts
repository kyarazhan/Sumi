import type { InjectionKey } from "vue";

/** App → ViewerPane：触发文档内搜索的桥（ViewerPane 持有实现，App 持有触发权） */
export interface DocSearchTrigger {
  set(open: () => void): void;
}

export const DOC_SEARCH_KEY: InjectionKey<DocSearchTrigger> = Symbol("doc-search");
