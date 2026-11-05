mod commands;

use std::sync::Mutex;
use tauri::{Emitter, Manager};

/// 启动参数携带的待打开路径（文件关联双击 / 命令行），前端取走前暂存
struct LaunchPaths(Mutex<Vec<String>>);

/// 提取参数中实际存在的路径（md 文档或目录），跳过可执行文件自身等无效项
fn arg_paths<'a, I>(argv: I) -> Vec<String>
where
    I: IntoIterator<Item = &'a String>,
{
    argv.into_iter()
        .filter(|a| std::path::Path::new(a).exists())
        .cloned()
        .collect()
}

/// 前端启动后取走待打开路径（一次性，取后清空）
#[tauri::command]
fn take_launch_paths(state: tauri::State<'_, LaunchPaths>) -> Vec<String> {
    state.0.lock().unwrap().drain(..).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // 已有实例在运行：把双击/命令行路径转发过去并聚焦窗口
            let paths = arg_paths(argv.iter().skip(1));
            if let Some(win) = app.get_webview_window("main") {
                if !paths.is_empty() {
                    let _ = win.emit("open-from-args", paths);
                }
                let _ = win.unminimize();
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::full_text_search,
            commands::write_text_file,
            commands::copy_file,
            take_launch_paths,
        ])
        .setup(|app| {
            // 首次启动：暂存文件关联/命令行传入的路径，供前端查询
            let argv: Vec<String> = std::env::args().collect();
            app.manage(LaunchPaths(Mutex::new(arg_paths(argv.iter().skip(1)))));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("墨阅启动失败");
}
