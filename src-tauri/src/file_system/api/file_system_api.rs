use std::sync::Arc;

use crate::{
    Guid,
    common::api_error::ApiError,
    file_system::{
        repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
        services::{
            item_creator::{FileCreator, FolderCreator},
            item_mover::{FileMover, FolderMover},
            item_renamer::{FileRenamer, FolderRenamer},
            review_tree_builder::ReviewTreeBuilder,
        },
    },
    infrastructure::extensions::unit_of_work::UnitOfWorkExt,
};
use injector::injector::Injector;
use tauri::State;

use crate::file_system::dto::review_tree_folder_dto::ReviewTreeFolderDto;

#[tauri::command]
pub async fn get_review_tree_folder_for_root(
    injector: State<'_, Arc<Injector>>,
) -> Result<ReviewTreeFolderDto, ApiError> {
    let scope = injector.start_scope();

    let result = scope
        .resolve::<dyn ReviewTreeBuilder>()
        .await
        .build()
        .await?;
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
        .resolve::<dyn FolderCreator>()
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
        .resolve::<dyn FileCreator>()
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
        .resolve::<dyn FileMover>()
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
        .resolve::<dyn FolderMover>()
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
        .resolve::<dyn FileRenamer>()
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
        .resolve::<dyn FolderRenamer>()
        .await
        .rename_folder(folder_id, new_name.try_into()?)
        .await?;
    scope.save_changes().await?;
    Ok(())
}
