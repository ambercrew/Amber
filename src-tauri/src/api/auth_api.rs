use brainy_core::sync::{models::UserInformnationDto, traits::brainy_backend_client::BrainyBackendClient};
use tauri::State;

use crate::api::ApiError;

#[tauri::command]
pub async fn login(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
    username: String,
    password: String,
) -> Result<(), ApiError> {
    backend_client.login(username, password).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_user_information(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
) -> Result<UserInformnationDto, ApiError> {
    let result = backend_client.get_user_information().await?;
    Ok(result)
}
