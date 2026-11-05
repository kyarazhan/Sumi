use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write as IoWrite;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// 单条全文搜索命中
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchHit {
    /// 文件绝对路径
    pub path: String,
    /// 文件名（不含扩展名），作为候选标题
    pub title: String,
    /// 命中所在行号（1 起）
    pub line: u32,
    /// 命中行内容（已裁剪，含命中词上下文）
    pub snippet: String,
}

const MD_EXTENSIONS: [&str; 4] = ["md", "markdown", "mdown", "mkd"];
/// 单文件读取上限：超过 8MB 的文档跳过正文搜索（防止超大文件拖慢全局搜索）
const MAX_FILE_BYTES: u64 = 8 * 1024 * 1024;

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|e| MD_EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

/// 提取命中行附近的一段上下文，命中词前后各留一些字符
fn build_snippet(line: &str, hit_start: usize, hit_len: usize) -> String {
    let chars: Vec<char> = line.chars().collect();
    let hit_end = (hit_start + hit_len).min(chars.len());
    let before = hit_start.saturating_sub(48);
    let after = (hit_end + 64).min(chars.len());
    let mut s = String::new();
    if before > 0 {
        s.push('…');
    }
    s.extend(&chars[before..after]);
    if after < chars.len() {
        s.push('…');
    }
    s
}

/// 在单个文件中查找命中（大小写不敏感），每文件最多返回 `per_file` 条
fn search_in_file(path: &Path, query_lower: &str, per_file: usize) -> Vec<SearchHit> {
    let Ok(meta) = fs::metadata(path) else {
        return Vec::new();
    };
    if !meta.is_file() || meta.len() > MAX_FILE_BYTES {
        return Vec::new();
    }
    let Ok(content) = fs::read_to_string(path) else {
        return Vec::new();
    };
    let title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string();
    let display = path.to_string_lossy().to_string();
    let mut hits = Vec::new();
    for (idx, line) in content.lines().enumerate() {
        if hits.len() >= per_file {
            break;
        }
        let line_lower = line.to_lowercase();
        if let Some(pos) = line_lower.find(query_lower) {
            hits.push(SearchHit {
                path: display.clone(),
                title: title.clone(),
                line: (idx + 1) as u32,
                snippet: build_snippet(line, pos, query_lower.chars().count()),
            });
        }
    }
    hits
}

/// 核心搜索逻辑：遍历 root 下所有 Markdown 文件做大小写不敏感子串匹配
fn search_markdown_files(root: &Path, query: &str, limit: usize) -> Vec<SearchHit> {
    let query_lower = query.trim().to_lowercase();
    if query_lower.is_empty() {
        return Vec::new();
    }
    let mut hits: Vec<SearchHit> = Vec::new();
    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            // 跳过常见依赖/版本管理目录
            let name = e.file_name().to_string_lossy().to_lowercase();
            name != "node_modules"
                && name != ".git"
                && name != "target"
                && name != ".venv"
                && name != "__pycache__"
        })
    {
        let Ok(entry) = entry else { continue };
        let path = entry.path();
        if !path.is_file() || !is_markdown(path) {
            continue;
        }
        hits.extend(search_in_file(path, &query_lower, 3));
        if hits.len() >= limit {
            break;
        }
    }
    hits.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
    hits.truncate(limit);
    hits
}

/// Tauri command：书架内全文搜索
#[tauri::command]
pub fn full_text_search(root: String, query: String, limit: Option<usize>) -> Vec<SearchHit> {
    search_markdown_files(Path::new(&root), &query, limit.unwrap_or(200))
}

/// Tauri command：将文本写入用户通过对话框选择的路径（用于导出 HTML）
#[tauri::command]
pub fn write_text_file(path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    let mut f = fs::File::create(&path).map_err(|e| e.to_string())?;
    f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    f.flush().map_err(|e| e.to_string())?;
    Ok(())
}

/// Tauri command：复制文件（编辑器插入本地图片时，把图复制到文档旁的 assets 目录）。
/// 自动创建目标父目录。
#[tauri::command]
pub fn copy_file(src: String, dest: String) -> Result<(), String> {
    let dest = PathBuf::from(&dest);
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(&src, &dest).map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_finds_hits_with_line_numbers() {
        let dir = std::env::temp_dir().join("md_reader_test_search");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("sub")).unwrap();
        fs::write(
            dir.join("a.md"),
            "# 标题A\n第一行内容\n这里包含 关键词 的句子\n",
        )
        .unwrap();
        fs::write(dir.join("sub").join("b.markdown"), "无关\n关键词出现在第二行\n").unwrap();
        fs::write(dir.join("notes.txt"), "关键词但不是markdown\n").unwrap();

        let hits = search_markdown_files(&dir, "关键词", 50);
        assert_eq!(hits.len(), 2);
        assert_eq!(hits[0].title, "a");
        assert_eq!(hits[0].line, 3);
        assert!(hits[0].snippet.contains("关键词"));
        assert_eq!(hits[1].title, "b");
        assert_eq!(hits[1].line, 2);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn search_skips_hidden_and_dep_dirs() {
        let dir = std::env::temp_dir().join("md_reader_test_skip");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("node_modules")).unwrap();
        fs::write(dir.join("node_modules").join("dep.md"), "关键词\n").unwrap();
        fs::write(dir.join("real.md"), "正文 关键词\n").unwrap();
        let hits = search_markdown_files(&dir, "关键词", 50);
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].title, "real");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn write_then_read_back() {
        let dir = std::env::temp_dir().join("md_reader_test_write");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let target = dir.join("out.html");
        write_text_file(target.to_string_lossy().to_string(), "<html></html>".into()).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "<html></html>");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn copy_file_creates_parent_dirs() {
        let dir = std::env::temp_dir().join("md_reader_test_copy");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        let src = dir.join("img.png");
        fs::write(&src, b"png-bytes").unwrap();
        let dest = dir.join("deep").join("assets").join("img.png");
        copy_file(
            src.to_string_lossy().to_string(),
            dest.to_string_lossy().to_string(),
        )
        .unwrap();
        assert_eq!(fs::read(&dest).unwrap(), b"png-bytes");
        let _ = fs::remove_dir_all(&dir);
    }
}
