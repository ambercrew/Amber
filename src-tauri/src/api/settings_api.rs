use std::sync::Arc;

use brainy_core::settings::Settings;
use tauri::{AppHandle, State};
use tokio::sync::Mutex;

use crate::{api::ApiError, dto::update_settings_request::UpdateSettingsRequest};

#[tauri::command]
pub async fn get_settings(settings: State<'_, Arc<Mutex<Settings>>>) -> Result<Settings, ApiError> {
    let settings = settings.lock().await;
    Ok(settings.clone())
}

#[tauri::command]
pub async fn update_settings(
    settings: State<'_, Arc<Mutex<Settings>>>,
    app_handle: AppHandle,
    new_settings: UpdateSettingsRequest,
) -> Result<(), ApiError> {
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
    settings.save_to_disk().await?;

    if restart {
        app_handle.request_restart();
    }
    Ok(())
}
