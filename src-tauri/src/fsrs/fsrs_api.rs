use std::sync::Arc;

use crate::{
    Guid,
    common::api_error::ApiError,
    fsrs::{
        dto::create_profile_request_dto::CreateProfileRequestDto,
        entities::fsrs_profile::FsrsProfile, repositories::fsrs_repository::FsrsRepository,
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
pub async fn delete_fsrs_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn FsrsRepository>()
        .await
        .delete_by_id(id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}
