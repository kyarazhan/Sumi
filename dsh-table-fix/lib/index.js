// Host half: a deliberately inert cordis plugin. Mounting this row is only
// what lets @deepseek-ai/dsh-client-modules scan this package, read its
// dsh.client declaration, and serve lib/client.js to the browser.
export const name = "table-fix";

export function apply(ctx) {
	// No host services are contributed.
}
