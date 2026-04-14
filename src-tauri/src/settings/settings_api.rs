use std::sync::Arc;

use crate::{
    common::api_error::ApiError,
    settings::{
        dto::{settings_dto::SettingsDto, update_settings_request::UpdateSettingsRequest},
        repositories::settings_repository::SettingsRepository,
        settings_service::SettingsService,
    },
};
use injector::injector::Injector;
use tauri::State;

#[tauri::command]
pub async fn get_settings(injector: State<'_, Arc<Injector>>) -> Result<SettingsDto, ApiError> {
    let scope = injector.start_scope();
    let settings_repository = scope.resolve::<dyn SettingsRepository>().await;
    let settings = settings_repository.get_settings().await;
    Ok(settings.into())
}

#[tauri::command]
pub async fn update_settings(
    injector: State<'_, Arc<Injector>>,
    new_settings: UpdateSettingsRequest,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let settings_service = scope.resolve::<SettingsService>().await;
    settings_service.update_settings(new_settings).await?;
    Ok(())
}
