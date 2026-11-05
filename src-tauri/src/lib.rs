mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::full_text_search,
            commands::write_text_file,
            commands::copy_file,
        ])
        .run(tauri::generate_context!())
        .expect("墨阅启动失败");
}
