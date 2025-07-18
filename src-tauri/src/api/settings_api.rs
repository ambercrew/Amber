use sea_orm::DbConn;
use tauri::State;
use tokio::sync::Mutex;

use crate::{
    dto::update_settings_request::UpdateSettingsRequest, value_objects::settings::Settings,
    service::settings_service,
};

#[tauri::command]
pub async fn get_settings() -> Result<Settings, ()> {
    Ok(settings_service::get_settings())
}

#[tauri::command]
pub async fn update_settings(
    db_conn: State<'_, Mutex<DbConn>>,
    new_settings: UpdateSettingsRequest,
) -> Result<(), String> {
    settings_service::update_settings(new_settings, &db_conn).await;
    Ok(())
}
