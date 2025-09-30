use brainy_core::sync::{
    models::UserInformnationDto, traits::brainy_backend_client::BrainyBackendClient,
};
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
pub async fn signup(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
    username: String,
    password: String,
    email: String,
    first_name: String,
    last_name: String,
) -> Result<(), ApiError> {
    backend_client
        .signup(username, password, email, first_name, last_name)
        .await?;
    Ok(())
}

// TODO: move to userapi instead of authapi
#[tauri::command]
pub async fn get_user_information(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
) -> Result<UserInformnationDto, ApiError> {
    let result = backend_client.get_user_information().await?;
    Ok(result)
}

#[tauri::command]
pub fn is_signed_in(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
) -> bool {
    backend_client.is_signed_in()
}

// TODO: move to userapi instead of authapi
#[tauri::command]
pub async fn update_user_information(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
    first_name: Option<String>,
    last_name: Option<String>,
) -> Result<(), ApiError> {
    backend_client.update_user_information(first_name, last_name).await?;
    Ok(())
}
