// The native shell is deliberately thin: the whole app is the web code in
// ../dist, and everything it stores lives in the webview's own storage.
// These three plugins back core/platform.js:
//   dialog + fs  -> "save as" for exports (android has no download bar)
//   opener       -> links with target="_blank" open in the system browser
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .run(tauri::generate_context!())
    .expect("error while running ~track");
}
