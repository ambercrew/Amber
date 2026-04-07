use std::sync::Arc;

use crate::{
    Guid,
    common::api_error::ApiError,
    file_system::{file_system_service::FileSystemService, models::exported_item::ExportedItem},
    infrastructure::extensions::unit_of_work::UnitOfWorkExt,
};
use injector::injector::Injector;
use tauri::State;
use tokio::{
    fs::{self, File},
    io::AsyncReadExt,
};

#[tauri::command]
pub async fn export_folder(
    injector: State<'_, Arc<Injector>>,
    folder_id: Guid,
    export_path: String,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let exported_item = scope
        .resolve::<FileSystemService>()
        .await
        .convert_folder_to_exported_item(folder_id)
        .await?;
    save_exported_item(exported_item, export_path).await
}

#[tauri::command]
pub async fn export_file(
    injector: State<'_, Arc<Injector>>,
    file_id: Guid,
    export_path: String,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let exported_item = scope
        .resolve::<FileSystemService>()
        .await
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

    fs::write(export_path, serde_json::to_string(&exported_item).unwrap()).await?;

    Ok(())
}

#[tauri::command]
pub async fn import(
    injector: State<'_, Arc<Injector>>,
    import_item_path: String,
    import_into_folder_id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();

    let mut file = File::open(import_item_path).await?;

    let mut file_content = String::new();
    file.read_to_string(&mut file_content).await?;

    let exported_item: ExportedItem = serde_json::from_str(&file_content)?;

    scope
        .resolve::<FileSystemService>()
        .await
        .import_exported_item(import_into_folder_id, exported_item)
        .await?;
    scope.save_changes().await?;

    Ok(())
}
