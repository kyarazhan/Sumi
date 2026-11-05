/**
 * 浏览器调试模式的示例文档库。
 * 覆盖阅读器全部渲染特性，便于无 Tauri 环境时验证渲染效果。
 */

export const SAMPLE_ROOT = "/示例文档库";

export const SAMPLE_LIBRARY: Record<string, string> = {
  [`${SAMPLE_ROOT}/README.md`]: `# MD 阅读器

一款**轻量级** Markdown 桌面阅读器与文档库。

## 特性

- 📚 多文件夹书架
- 🔍 全文搜索
- 📑 大纲导航
- 🌙 深浅主题
- 📤 导出 HTML / PDF

## 渲染增强

| 能力 | 状态 |
| --- | --- |
| 代码高亮 | ✅ |
| 数学公式 | ✅ |
| Mermaid 图表 | ✅ |
| 任务列表 | ✅ |
| 脚注 | ✅ |

> 提示：在桌面版中，把任意文件夹拖进窗口即可加入书架。

前往 [Markdown 语法速查](Markdown%20语法速查.md) 查看完整渲染示例。
`,
  [`${SAMPLE_ROOT}/Markdown 语法速查.md`]: `# Markdown 语法速查

本文档覆盖阅读器支持的全部 Markdown 语法。

## 标题层级

### 三级标题
#### 四级标题
##### 五级标题

## 文本格式

**粗体**、*斜体*、***粗斜体***、~~删除线~~、\`行内代码\`、[链接](https://example.com)。

自动链接：https://github.com

## 引用

> 这是一段引用。
> 可以多行。
>
> —— 出处

## 列表

### 无序列表

- 第一项
- 第二项
  - 嵌套项 A
  - 嵌套项 B

### 有序列表

1. 第一步
2. 第二步
3. 第三步

### 任务列表

- [x] 已完成事项
- [ ] 待办事项一
- [ ] 待办事项二

## 代码块

\`\`\`rust
fn main() {
    let greeting = "你好，世界";
    println!("{greeting}");
    for i in 1..=3 {
        println!("第 {i} 次问候");
    }
}
\`\`\`

\`\`\`python
def fib(n: int) -> int:
    """斐波那契数列"""
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`

\`\`\`mermaid
flowchart LR
    A[打开文件夹] --> B{是书架成员?}
    B -->|是| C[渲染文档]
    B -->|否| D[加入书架]
    D --> C
    C --> E[阅读 📖]
\`\`\`

## 表格

| 语法 | 说明 | 示例 |
|:-----|:----:|-----:|
| \`**粗体**\` | 加粗 | **粗体** |
| \`*斜体*\` | 倾斜 | *斜体* |
| \`~~删除~~\` | 删除线 | ~~删除~~ |

## 脚注

这是一个带脚注的句子[^1]，还可以有第二个脚注[^note]。

[^1]: 这是第一个脚注的内容。
[^note]: 命名脚注也很方便。

## 分隔线

---

## 行内 HTML

支持 <kbd>Ctrl</kbd> + <kbd>O</kbd> 快捷键，以及 <mark>高亮标记</mark>。
`,
  [`${SAMPLE_ROOT}/数学公式示例.md`]: `# 数学公式示例

## 行内公式

质能方程 $E = mc^2$ 是最著名的物理公式之一。欧拉恒等式 $e^{i\\pi} + 1 = 0$ 同样优美。

## 块级公式

高斯积分：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

麦克斯韦方程组（节选）：

$$
\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}
$$

## 矩阵

$$
A = \\begin{pmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{pmatrix}
$$

## 求和与极限

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}, \\qquad
\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1
$$
`,
  [`${SAMPLE_ROOT}/Mermaid 图表示例.md`]: `# Mermaid 图表示例

## 流程图

\`\`\`mermaid
flowchart TD
    A[用户打开文档] --> B[解析 Markdown]
    B --> C{包含特殊块?}
    C -->|公式| D[KaTeX 渲染]
    C -->|图表| E[Mermaid 渲染]
    C -->|代码| F[highlight.js]
    D & E & F --> G[输出 HTML]
    G --> H[应用主题样式]
\`\`\`

## 时序图

\`\`\`mermaid
sequenceDiagram
    participant UI as 前端界面
    participant S as 文件监听
    participant F as 文件系统
    UI->>F: 读取文档
    F-->>UI: 返回内容
    loop 阅读期间
        F->>S: 文件变更事件
        S-->>UI: 通知刷新
        UI->>F: 重新读取
        F-->>UI: 新内容
    end
\`\`\`

## 甘特图

\`\`\`mermaid
gantt
    title 阅读器开发计划
    dateFormat YYYY-MM-DD
    section 基础
    渲染引擎      :done, a1, 2026-11-04, 2d
    文档库        :active, a2, after a1, 2d
    section 体验
    搜索与导出    :a3, after a2, 2d
    打包发布      :a4, after a3, 1d
\`\`\`
`,
  [`${SAMPLE_ROOT}/任务清单.md`]: `# 今日任务

## 工作

- [x] 整理会议纪要
- [ ] 评审 PR #128
- [ ] 编写周报

## 阅读

- [x] 《深入浅出 Rust》第 3 章
- [ ] 《设计数据密集型应用》第 5 章
  - [x] 复制模型
  - [ ] 分区策略
`,
  [`${SAMPLE_ROOT}/子目录/长文阅读示例.md`]: `# 长文阅读示例

> 本文档用于验证大纲导航、滚动联动与阅读进度记忆。

## 引言

深度阅读是知识管理的基石。一份结构清晰的长文，应当能够：

1. 让读者快速定位感兴趣的章节
2. 在返回时恢复上次的阅读位置
3. 在侧栏展示完整的大纲结构

## 第一章：文档结构

### 1.1 标题的意义

标题是文档的骨架。良好层级应当逐级递进，避免跳级。

### 1.2 段落与节奏

长段落应当拆分。一般而言，每段以 3~5 句为宜。

> 排版是阅读体验的一半。

## 第二章：排版细节

### 2.1 行长控制

研究表明，单行文字以 **35~75 个字符** 为宜，过长的行会显著增加阅读负担。

### 2.2 行距与字距

- 正文的行距建议为字号的 1.6~1.8 倍
- 段间距可以略大于行距
- 中文排版应避免两端对齐产生的过大字距

### 2.3 层级对比

通过字号、字重与颜色的组合区分标题层级，而不是依赖下划线。

## 第三章：阅读器功能

### 3.1 大纲导航

点击侧栏大纲项可跳转至对应章节；滚动时大纲自动高亮当前位置。

### 3.2 进度记忆

关闭文档后重新打开，阅读器会恢复到上次的滚动位置。

### 3.3 主题切换

深色主题在夜间阅读时可显著降低视觉疲劳。

## 结语

工欲善其事，必先利其器。一款称手的阅读器，是长期知识积累的起点。
`,
};

export interface MockFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  children?: MockFileEntry[];
}

/** 由扁平的 path→content 映射构建 mock 目录树 */
export function buildSampleTree(): MockFileEntry[] {
  const root: MockFileEntry[] = [];
  const dirs = new Map<string, MockFileEntry>();
  const ensureDir = (dirPath: string, name: string): MockFileEntry => {
    let d = dirs.get(dirPath);
    if (!d) {
      d = { name, path: dirPath, isDirectory: true, isFile: false, children: [] };
      dirs.set(dirPath, d);
      const parentPath = dirPath.slice(0, dirPath.lastIndexOf("/"));
      if (parentPath && parentPath !== SAMPLE_ROOT) {
        ensureDir(parentPath, parentPath.slice(parentPath.lastIndexOf("/") + 1)).children!.push(d);
      } else {
        root.push(d);
      }
    }
    return d;
  };

  for (const filePath of Object.keys(SAMPLE_LIBRARY)) {
    const name = filePath.slice(filePath.lastIndexOf("/") + 1);
    const dirPath = filePath.slice(0, filePath.lastIndexOf("/"));
    const parent = dirPath === SAMPLE_ROOT ? { children: root } : ensureDir(dirPath, dirPath.slice(dirPath.lastIndexOf("/") + 1));
    parent.children!.push({ name, path: filePath, isDirectory: false, isFile: true });
  }
  return root;
}
