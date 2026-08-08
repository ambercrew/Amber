use std::sync::Arc;

use crate::{
    common::api_error::ApiError, infrastructure::extensions::unit_of_work::UnitOfWorkExt,
    sync::services::syncer::Syncer,
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
        .resolve::<dyn Syncer>()
        .await
        .sync_with_backend()
        .await?;

    scope.save_changes().await?;

    Ok(())
}
