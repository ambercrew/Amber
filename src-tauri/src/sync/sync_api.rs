use std::sync::Arc;

use crate::{
    common::{api_error::ApiError, unit_of_work_ext::UnitOfWorkExt},
    sync::sync_service::SyncService,
};
use injector::injector::Injector;
use tauri::State;

#[tauri::command]
pub async fn sync(injector: State<'_, Arc<Injector>>) -> Result<(), ApiError> {
    let scope = injector.start_scope();

    scope
        .disable_foreign_key_constraint_for_current_transaction()
        .await?;

    scope
        .resolve::<SyncService>()
        .await
        .sync_with_backend()
        .await?;

    scope.save_changes().await?;

    Ok(())
}
