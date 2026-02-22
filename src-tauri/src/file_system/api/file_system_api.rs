use std::sync::Arc;

use crate::{
    Guid,
    cells::repositories::traits::cell_repository::CellRepository,
    common::{api_error::ApiError, unit_of_work_ext::UnitOfWorkExt},
    file_system::{
        file_system_service::FileSystemService,
        repositories::traits::{
            file_repository::FileRepository, folder_repository::FolderRepository,
        },
    },
};
use injector::injector::Injector;
use tauri::State;

use crate::file_system::dto::review_tree_folder::ReviewTreeFolder;

#[tauri::command]
pub async fn get_review_tree_folder_for_root(
    injector: State<'_, Arc<Injector>>,
) -> Result<ReviewTreeFolder, ApiError> {
    let scope = injector.start_scope();

    let folders = scope
        .resolve::<dyn FolderRepository>()
        .await
        .get_all_folders()
        .await?;
    let files = scope
        .resolve::<dyn FileRepository>()
        .await
        .get_all_files()
        .await?;

    let repetition_counts = scope
        .resolve::<dyn CellRepository>()
        .await
        .get_study_repetitions_for_all_files()
        .await?;

    let result = ReviewTreeFolder::parse_file_system_from_root(&folders, &files, repetition_counts);
    Ok(result)
}

#[tauri::command]
pub async fn create_folder(
    injector: State<'_, Arc<Injector>>,
    parent_id: Option<Guid>,
    name: String,
) -> Result<Guid, ApiError> {
    let scope = injector.start_scope();

    let folder_id = scope
        .resolve::<FileSystemService>()
        .await
        .create_folder(parent_id, name.try_into()?)
        .await?;

    scope.save_changes().await?;

    Ok(folder_id)
}

#[tauri::command]
pub async fn create_file(
    injector: State<'_, Arc<Injector>>,
    parent_id: Option<Guid>,
    name: String,
) -> Result<Guid, ApiError> {
    let scope = injector.start_scope();

    let file_id = scope
        .resolve::<FileSystemService>()
        .await
        .create_file(parent_id, name.try_into()?)
        .await?;

    scope.save_changes().await?;

    Ok(file_id)
}

#[tauri::command]
pub async fn delete_file(
    injector: State<'_, Arc<Injector>>,
    file_id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn FileRepository>()
        .await
        .delete_by_id(file_id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_folder(
    injector: State<'_, Arc<Injector>>,
    folder_id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn FolderRepository>()
        .await
        .delete_by_id(folder_id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn move_file(
    injector: State<'_, Arc<Injector>>,
    file_id: Guid,
    destination_folder_id: Option<Guid>,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<FileSystemService>()
        .await
        .move_file(file_id, destination_folder_id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn move_folder(
    injector: State<'_, Arc<Injector>>,
    folder_id: Guid,
    destination_folder_id: Option<Guid>,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<FileSystemService>()
        .await
        .move_folder(folder_id, destination_folder_id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_file(
    injector: State<'_, Arc<Injector>>,
    file_id: Guid,
    new_name: String,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<FileSystemService>()
        .await
        .rename_file(file_id, new_name.try_into()?)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_folder(
    injector: State<'_, Arc<Injector>>,
    folder_id: Guid,
    new_name: String,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<FileSystemService>()
        .await
        .rename_folder(folder_id, new_name.try_into()?)
        .await?;
    scope.save_changes().await?;
    Ok(())
}
