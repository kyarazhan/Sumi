window.__ModuleLoader__.load({
	id: "dsh-table-fix",
	factory: (require) => {
		const css = [
			/* Markdown chat tables: readable layout.
			   1. Columns never collapse below ~3 characters, which is what forced
			      headers like "任务项" to wrap one CJK character per line.
			   2. Wide tables scroll horizontally instead of squeezing every column.
			   3. Cell text breaks at word boundaries; inline code in cells does not
			      break per character. */
			"[class*='markdown'] table, [class*='prose'] table, .dsh-md table, table {",
			"  table-layout: auto;",
			"}",
			"[class*='markdown'] td, [class*='markdown'] th,",
			"[class*='prose'] td, [class*='prose'] th,",
			"td, th {",
			"  min-width: 4.5em;",
			"  white-space: normal;",
			"  word-break: normal;",
			"  overflow-wrap: break-word;",
			"  vertical-align: top;",
			"}",
			"[class*='markdown'] th, [class*='prose'] th, th {",
			"  white-space: nowrap;",
			"  min-width: 3em;",
			"}",
			"[class*='markdown'] td > code, [class*='markdown'] th > code,",
			"[class*='prose'] td > code, [class*='prose'] th > code,",
			"td > code, th > code {",
			"  white-space: nowrap;",
			"}",
			/* Long code or links inside cells may still need a controlled break. */
			"td code:only-child {",
			"  overflow-wrap: anywhere;",
			"  white-space: normal;",
			"}"
		].join("\n");
		const tagId = "dsh-table-fix/style";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"" + tagId + "\"]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-table-fix";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const name = "table-fix";
		const inject = [];
		function apply(ctx) {
			// CSS is installed at materialization; nothing further to register.
		}
		return { apply, inject, name };
	}
});
