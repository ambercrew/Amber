use brainy_core::sync::traits::brainy_backend_client::BrainyBackendClient;
use tauri::State;

use crate::api::ApiError;

#[tauri::command]
pub async fn sign_in(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
    username: String,
    password: String,
) -> Result<(), ApiError> {
    backend_client.log_in(username, password).await?;
    Ok(())
}

#[tauri::command]
pub async fn sign_up(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
    username: String,
    password: String,
    email: String,
    first_name: String,
    last_name: String,
) -> Result<(), ApiError> {
    backend_client
        .sign_up(username, password, email, first_name, last_name)
        .await?;
    Ok(())
}

#[tauri::command]
pub fn is_signed_in(backend_client: State<'_, Box<dyn BrainyBackendClient>>) -> bool {
    backend_client.is_signed_in()
}
