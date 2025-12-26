use std::sync::Arc;

use brainy_core::{
    common::traits::repositories_context::RepositoriesContext, sync::sync_service::SyncService,
};
use tauri::State;
use tokio::sync::Mutex;

use crate::api::ApiError;

#[tauri::command]
pub async fn sync(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    sync_service: State<'_, Arc<SyncService>>,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    context
        .disable_foreign_key_constraint_for_current_transaction()
        .await?;

    let result = sync_service.sync_with_backend().await;
    if let Err(err) = result {
        context.rollback().await?;
        return Err(err.into());
    }

    let result = context.save_changes().await;
    if let Err(err) = result {
        context.rollback().await?;
        return Err(err.into());
    }

    Ok(())
}
