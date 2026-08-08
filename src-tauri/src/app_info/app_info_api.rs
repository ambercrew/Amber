#[tauri::command]
pub fn is_store_installed() -> bool {
    cfg!(store) || std::env::var("STORE_BUILD").as_deref() == Ok("1")
}
