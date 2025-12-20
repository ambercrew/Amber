use std::sync::Arc;

use brainy_core::backend::{
    models::UserInformationDto, traits::brainy_backend_client::BrainyBackendClient,
};
use tauri::State;

use crate::api::ApiError;

#[tauri::command]
pub async fn get_user_information(
    backend_client: State<'_, Arc<dyn BrainyBackendClient>>,
) -> Result<UserInformationDto, ApiError> {
    let result = backend_client.get_user_information().await?;
    Ok(result)
}

#[tauri::command]
pub async fn update_user_information(
    backend_client: State<'_, Arc<dyn BrainyBackendClient>>,
    first_name: Option<String>,
    last_name: Option<String>,
) -> Result<(), ApiError> {
    backend_client
        .update_user_information(first_name, last_name)
        .await?;
    Ok(())
}
