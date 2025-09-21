use std::sync::Arc;

use brainy_core::{
    Guid, common::traits::repositories_context::RepositoriesContext,
    file_system::file_system_service::FileSystemService,
};
use tauri::State;
use tokio::sync::Mutex;

use crate::{api::ApiError, dto::review_tree_folder::ReviewTreeFolder};

#[tauri::command]
pub async fn get_review_tree_folder_for_root(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
) -> Result<ReviewTreeFolder, ApiError> {
    let context = context.lock().await;
    let folders = context.folder_repository().get_all_folders().await?;
    let files = context.file_repository().get_all_files().await?;
    let repetition_counts = context
        .cell_repository()
        .get_study_repetitions_for_all_files()
        .await?;
    let result = ReviewTreeFolder::parse_file_system_from_root(&folders, &files, repetition_counts);
    Ok(result)
}

#[tauri::command]
pub async fn create_folder(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_system_service: State<'_, Arc<FileSystemService>>,
    parent_id: Option<Guid>,
    name: String,
) -> Result<Guid, ApiError> {
    let mut context = context.lock().await;

    let folder_id = file_system_service
        .create_folder(parent_id, name.try_into()?)
        .await?;

    context.save_changes().await?;

    Ok(folder_id)
}

#[tauri::command]
pub async fn create_file(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_system_service: State<'_, Arc<FileSystemService>>,
    parent_id: Option<Guid>,
    name: String,
) -> Result<Guid, ApiError> {
    let mut context = context.lock().await;

    let file_id = file_system_service
        .create_file(parent_id, name.try_into()?)
        .await?;

    context.save_changes().await?;

    Ok(file_id)
}

#[tauri::command]
pub async fn delete_file(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_id: Guid,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    context.file_repository().delete_by_id(file_id).await?;
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_folder(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    folder_id: Guid,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    context.folder_repository().delete_by_id(folder_id).await?;
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn move_file(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_system_service: State<'_, Arc<FileSystemService>>,
    file_id: Guid,
    destination_folder_id: Option<Guid>,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    file_system_service
        .move_file(file_id, destination_folder_id)
        .await?;
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn move_folder(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_system_service: State<'_, Arc<FileSystemService>>,
    folder_id: Guid,
    destination_folder_id: Option<Guid>,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    file_system_service
        .move_folder(folder_id, destination_folder_id)
        .await?;
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_file(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_system_service: State<'_, Arc<FileSystemService>>,
    file_id: Guid,
    new_name: String,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    file_system_service
        .rename_file(file_id, new_name.try_into()?)
        .await?;
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_folder(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_system_service: State<'_, Arc<FileSystemService>>,
    folder_id: Guid,
    new_name: String,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    file_system_service
        .rename_folder(folder_id, new_name.try_into()?)
        .await?;
    context.save_changes().await?;
    Ok(())
}
