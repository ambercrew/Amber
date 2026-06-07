use std::sync::Arc;

use crate::{
    Guid,
    common::api_error::ApiError,
    file_system::{
        repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
        value_objects::fsrs_profile_choice::FsrsProfileChoice,
    },
    fsrs::{
        dto::create_profile_request_dto::CreateProfileRequestDto,
        entities::fsrs_profile::FsrsProfile,
        repositories::fsrs_repository::FsrsRepository,
        services::{
            fsrs_profile_deleter::FsrsProfileDeleter, fsrs_profile_resolver::FsrsProfileResolver,
        },
    },
    infrastructure::extensions::unit_of_work::UnitOfWorkExt,
};
use injector::injector::Injector;
use tauri::State;

#[tauri::command]
pub async fn get_all_fsrs_profiles(
    injector: State<'_, Arc<Injector>>,
) -> Result<Vec<FsrsProfile>, ApiError> {
    let scope = injector.start_scope();
    let result = scope
        .resolve::<dyn FsrsRepository>()
        .await
        .get_all_fsrs_profiles()
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn get_file_fsrs_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let file = scope
        .resolve::<dyn FileRepository>()
        .await
        .get_by_id(id)
        .await?;

    let result = scope
        .resolve::<dyn FsrsProfileResolver>()
        .await
        .get_for_item(file.fsrs_profile_choice(), file.parent_id())
        .await?;
    scope.save_changes().await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_folder_fsrs_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let folder = scope
        .resolve::<dyn FolderRepository>()
        .await
        .get_by_id(id)
        .await?;

    let result = scope
        .resolve::<dyn FsrsProfileResolver>()
        .await
        .get_for_item(folder.fsrs_profile_choice(), folder.parent_id())
        .await?;
    scope.save_changes().await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_fsrs_profile_choice_for_folder(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfileChoice, ApiError> {
    let scope = injector.start_scope();
    let folder = scope
        .resolve::<dyn FolderRepository>()
        .await
        .get_by_id(id)
        .await?;
    Ok(folder.fsrs_profile_choice())
}

#[tauri::command]
pub async fn get_fsrs_profile_choice_for_file(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfileChoice, ApiError> {
    let scope = injector.start_scope();
    let file = scope
        .resolve::<dyn FileRepository>()
        .await
        .get_by_id(id)
        .await?;
    Ok(file.fsrs_profile_choice())
}

#[tauri::command]
pub async fn get_parent_fsrs_profile_for_folder(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let folder_repository = scope.resolve::<dyn FolderRepository>().await;

    let folder = folder_repository.get_by_id(id).await?;
    let parent = folder_repository
        .get_by_id(folder.parent_id().unwrap())
        .await?;

    let result = scope
        .resolve::<dyn FsrsProfileResolver>()
        .await
        .get_for_item(parent.fsrs_profile_choice(), parent.parent_id())
        .await?;
    scope.save_changes().await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_parent_fsrs_profile_for_file(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let file = scope
        .resolve::<dyn FileRepository>()
        .await
        .get_by_id(id)
        .await?;
    let parent = scope
        .resolve::<dyn FolderRepository>()
        .await
        .get_by_id(file.parent_id().unwrap())
        .await?;

    let result = scope
        .resolve::<dyn FsrsProfileResolver>()
        .await
        .get_for_item(parent.fsrs_profile_choice(), parent.parent_id())
        .await?;
    scope.save_changes().await?;

    Ok(result)
}

#[tauri::command]
pub async fn create_profile(
    injector: State<'_, Arc<Injector>>,
    request: CreateProfileRequestDto,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let profile = FsrsProfile::new(
        None,
        request.name,
        request.request_retention,
        request.maximum_interval,
        request.weights,
    )?;
    scope
        .resolve::<dyn FsrsRepository>()
        .await
        .create(&profile)
        .await?;
    scope.save_changes().await?;
    Ok(profile)
}

#[tauri::command]
pub async fn update_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
    name: String,
    request_retention: f64,
    maximum_interval: f64,
    weights: Vec<f64>,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let fsrs_repository = scope.resolve::<dyn FsrsRepository>().await;

    let mut profile = fsrs_repository.get_by_id(id).await?;
    profile.set_name(name);
    profile.set_request_retention(request_retention);
    profile.set_maximum_interval(maximum_interval);
    profile.set_weights(weights);

    fsrs_repository.update(&profile).await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn set_fsrs_profile_choice_for_folder(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
    fsrs_profile_choice: FsrsProfileChoice,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let folder_repository = scope.resolve::<dyn FolderRepository>().await;

    let mut folder = folder_repository.get_by_id(id).await?;
    folder.set_fsrs_profile_choice(fsrs_profile_choice);
    folder_repository.update(&folder).await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn set_fsrs_profile_choice_for_file(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
    fsrs_profile_choice: FsrsProfileChoice,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let file_repository = scope.resolve::<dyn FileRepository>().await;

    let mut file = file_repository.get_by_id(id).await?;
    file.set_fsrs_profile_choice(fsrs_profile_choice);
    file_repository.update(&file).await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_fsrs_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn FsrsProfileDeleter>()
        .await
        .delete_by_id(id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}
