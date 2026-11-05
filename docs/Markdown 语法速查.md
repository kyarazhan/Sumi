# Markdown 语法速查

本文档覆盖阅读器支持的全部 Markdown 语法，可用于验证渲染效果。

## 标题层级

### 三级标题
#### 四级标题
##### 五级标题

## 文本格式

**粗体**、*斜体*、***粗斜体***、~~删除线~~、`行内代码`、[链接](https://example.com)。

自动链接：<https://github.com>

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

```rust
fn main() {
    let greeting = "你好，世界";
    println!("{greeting}");
    for i in 1..=3 {
        println!("第 {i} 次问候");
    }
}
```

```python
def fib(n: int) -> int:
    """斐波那契数列"""
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

```javascript
const greet = (name) => {
  console.log(`Hello, ${name}!`);
};
greet("MD Reader");
```

## 表格

| 语法 | 说明 | 示例 |
|:-----|:----:|-----:|
| `**粗体**` | 加粗 | **粗体** |
| `*斜体*` | 倾斜 | *斜体* |
| `~~删除~~` | 删除线 | ~~删除~~ |

## 脚注

这是一个带脚注的句子[^1]，还可以有第二个脚注[^note]。

[^1]: 这是第一个脚注的内容。
[^note]: 命名脚注也很方便。

## 分隔线

---

## 行内 HTML

支持 <kbd>Ctrl</kbd> + <kbd>O</kbd> 快捷键，以及 <mark>高亮标记</mark>。
