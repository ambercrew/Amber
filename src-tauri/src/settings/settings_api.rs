use std::sync::Arc;

use crate::{
    common::api_error::ApiError,
    settings::{Settings, dto::update_settings_request::UpdateSettingsRequest},
};
use injector::injector::Injector;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_settings(injector: State<'_, Arc<Injector>>) -> Result<Settings, ApiError> {
    let scope = injector.start_scope();
    let settings = scope.resolve::<Mutex<Settings>>().await;
    let settings = settings.lock().await;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn update_settings(
    injector: State<'_, Arc<Injector>>,
    app_handle: AppHandle,
    new_settings: UpdateSettingsRequest,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let settings = scope.resolve::<Mutex<Settings>>().await;
    let mut settings = settings.lock().await;

    let mut restart = false;
    if let Some(database_location) = new_settings.database_location
        && settings.database_location != database_location
    {
        settings.database_location = database_location;
        restart = true;
    }
    if let Some(theme) = new_settings.theme {
        settings.theme = theme;
    }
    if let Some(zoom_percentage) = new_settings.zoom_percentage {
        settings.zoom_percentage = zoom_percentage;
    }
    if let Some(auto_sync) = new_settings.auto_sync {
        settings.auto_sync = auto_sync;
    }
    if let Some(enable_ai) = new_settings.enable_ai {
        settings.enable_ai = enable_ai;
    }
    if let Some(ollama_model_name) = new_settings.ollama_model_name {
        settings.ollama_model_name = ollama_model_name;
    }
    if let Some(ollama_embeddings_model_name) = new_settings.ollama_embeddings_model_name {
        settings.ollama_embeddings_model_name = ollama_embeddings_model_name;
    }
    settings.save_to_disk().await?;

    if restart {
        app_handle.request_restart();
    }
    Ok(())
}
