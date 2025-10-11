use brainy_core::backend::traits::brainy_backend_client::BrainyBackendClient;
use tauri::State;

use crate::api::ApiError;

#[tauri::command]
pub async fn sync(
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
) -> Result<(), ApiError> {
    // TODO:
    Ok(())
}
