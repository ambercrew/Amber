#[tauri::command]
pub fn is_store_installed() -> bool {
    cfg!(store)
}
