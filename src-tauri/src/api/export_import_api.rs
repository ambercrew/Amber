use std::sync::Arc;

use brainy_core::{
    Guid,
    common::traits::repositories_context::RepositoriesContext,
    file_system::{file_system_service::FileSystemService, models::exported_item::ExportedItem},
};
use tauri::State;
use tokio::{
    fs::{self, File},
    io::AsyncReadExt,
    sync::Mutex,
};

use crate::api::ApiError;

#[tauri::command]
pub async fn export_folder(
    file_system_service: State<'_, Arc<FileSystemService>>,
    folder_id: Guid,
    export_path: String,
) -> Result<(), ApiError> {
    let exported_item = file_system_service
        .convert_folder_to_exported_item(folder_id)
        .await?;
    save_exported_item(exported_item, export_path).await
}

#[tauri::command]
pub async fn export_file(
    file_system_service: State<'_, Arc<FileSystemService>>,
    file_id: Guid,
    export_path: String,
) -> Result<(), ApiError> {
    let exported_item = file_system_service
        .convert_file_to_exported_item(file_id)
        .await?;
    save_exported_item(exported_item, export_path).await
}

async fn save_exported_item(
    exported_item: ExportedItem,
    export_path: String,
) -> Result<(), ApiError> {
    let mut export_path = export_path;
    if !export_path.ends_with(".json") {
        export_path = format!("{export_path}.json").to_string();
    }

    if let Err(err) = fs::write(export_path, serde_json::to_string(&exported_item).unwrap()).await {
        return Err(ApiError(err.to_string()));
    }

    Ok(())
}

#[tauri::command]
pub async fn import(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_system_service: State<'_, Arc<FileSystemService>>,
    import_item_path: String,
    import_into_folder_id: Guid,
) -> Result<(), ApiError> {
    let context = context.lock().await;

    let mut file = match File::open(import_item_path).await {
        Err(err) => return Err(ApiError(err.to_string())),
        Ok(file) => file,
    };

    let mut file_content = String::new();
    if let Err(err) = file.read_to_string(&mut file_content).await {
        return Err(ApiError(err.to_string()));
    }

    let exported_item: ExportedItem = match serde_json::from_str(&file_content) {
        Ok(exported_item) => exported_item,
        Err(err) => return Err(ApiError(err.to_string())),
    };

    file_system_service
        .import_exported_item(import_into_folder_id, exported_item)
        .await?;
    context.save_changes().await?;

    Ok(())
}
