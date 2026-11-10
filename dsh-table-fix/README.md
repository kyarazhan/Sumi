# dsh-table-fix

DSH(deepseek-harness)Web GUI 的 Markdown 表格排版修复插件。

## 解决的问题

- 窄列把中文压成"一字一行"(例如表头 `任务项` 被竖排);
- 宽表格没有横向滚动,列被挤压;
- 单元格里的 inline code 被逐字符断行。

## 修复内容

向 Web GUI 注入一段 CSS:

- `td` / `th` 最小列宽 4.5em,表头单行(`white-space: nowrap`);
- 单元格按词边界换行(`overflow-wrap: break-word`),inline code 不逐字符断行;
- 列宽自适应(`table-layout: auto`),列内顶部对齐。

## 安装

在 DSH 会话中:

```
plugin_manager: action=install_bundle, target="file:<本目录路径>"
```

或使用 CLI(等价于 pnpm 安装 + 启用):

```
dsh plugin install file:<本目录路径>
```

安装后在 Web GUI 中刷新页面即可生效;在 插件 页面移除该 bundle 即可完全还原。

## 打包 / 发版

```
pnpm pack          # 产出 dsh-table-fix-1.0.0.tgz
npm publish        # 如需发布到 registry(需先 npm login)
```

安装 tarball:

```
plugin_manager: action=install_bundle, target="file:<路径>/dsh-table-fix-1.0.0.tgz"
```

## 结构

| 文件 | 作用 |
| --- | --- |
| `cordis.patch.yml` | bundle patch:挂载 `table-fix` 行 |
| `lib/index.js` | 宿主半(空插件,仅为让 client-modules 扫描到本包) |
| `lib/client.js` | 浏览器半:注入 CSS |
| `icon.svg` | 插件页图标 |

## License

MIT
