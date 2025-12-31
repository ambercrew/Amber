use std::sync::Arc;

use brainy_core::backend::traits::brainy_backend_client::BrainyBackendClient;
use tauri::State;

use crate::api::ApiError;

#[tauri::command]
pub async fn sign_in(
    backend_client: State<'_, Arc<dyn BrainyBackendClient>>,
    username: String,
    password: String,
) -> Result<(), ApiError> {
    backend_client.log_in(username, password).await?;
    Ok(())
}

#[tauri::command]
pub async fn sign_up(
    backend_client: State<'_, Arc<dyn BrainyBackendClient>>,
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
pub async fn sign_out(
    backend_client: State<'_, Arc<dyn BrainyBackendClient>>,
) -> Result<(), ApiError> {
    backend_client.sign_out().await?;
    Ok(())
}

#[tauri::command]
pub fn is_signed_in(backend_client: State<'_, Arc<dyn BrainyBackendClient>>) -> bool {
    backend_client.is_signed_in()
}

#[tauri::command]
pub async fn verify_user_email(
    backend_client: State<'_, Arc<dyn BrainyBackendClient>>,
    verification_code: String,
) -> Result<(), ApiError> {
    backend_client.verify_user_email(verification_code).await?;
    Ok(())
}

#[tauri::command]
pub async fn resend_email_verification_code(
    backend_client: State<'_, Arc<dyn BrainyBackendClient>>,
) -> Result<(), ApiError> {
    backend_client.resend_email_verification_code().await?;
    Ok(())
}
