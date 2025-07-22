use crate::service::export_import_service;
use sea_orm::DbConn;
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn export(
    db_conn: State<'_, Mutex<DbConn>>,
    item_id: i32,
    export_path: String,
) -> Result<(), String> {
    let mut export_path = export_path;
    if !export_path.ends_with(".json") {
        export_path = format!("{export_path}.json").to_string();
    }
    let db_conn = db_conn.lock().await;
    export_import_service::export(&db_conn, item_id, export_path).await
}

#[tauri::command]
pub async fn import(
    db_conn: State<'_, Mutex<DbConn>>,
    import_item_path: String,
    import_into_folder_id: i32,
) -> Result<(), String> {
    let db_conn = db_conn.lock().await;
    export_import_service::import(&db_conn, import_item_path, import_into_folder_id).await
}
