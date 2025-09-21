use std::sync::Arc;

use crate::api::ApiError;
use brainy_core::Guid;
use brainy_core::cells::models::file_repetitions_count::FileRepetitionCounts;
use brainy_core::common::traits::repositories_context::RepositoriesContext;
use tauri::State;
use tokio::sync::Mutex;

/// Returns the count of repetitions ready for study, i.e. their due is less
/// than or equal to now.
#[tauri::command]
pub async fn get_study_repetition_counts(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_id: Guid,
) -> Result<FileRepetitionCounts, ApiError> {
    let context = context.lock().await;
    let result = context
        .cell_repository()
        .get_study_repetitions(file_id)
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn reset_repetitions_for_cell(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    cell_id: Guid,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    let mut cell = context.cell_repository().get_by_id(cell_id).await?;
    cell.reset_repetitions();
    context.cell_repository().update(&cell).await?;
    context.save_changes().await?;
    Ok(())
}
