use std::sync::Arc;

use crate::Guid;
use crate::cells::repositories::cell_repository::CellRepository;
use crate::cells::value_objects::file_repetitions_count::FileRepetitionCounts;
use crate::common::api_error::ApiError;
use crate::infrastructure::extensions::unit_of_work::UnitOfWorkExt;
use injector::injector::Injector;
use tauri::State;

/// Returns the count of repetitions ready for study, i.e. their due is less
/// than or equal to now.
#[tauri::command]
pub async fn get_study_repetition_counts(
    injector: State<'_, Arc<Injector>>,
    file_id: Guid,
) -> Result<FileRepetitionCounts, ApiError> {
    let scope = injector.start_scope();
    let result = scope
        .resolve::<dyn CellRepository>()
        .await
        .get_study_repetitions(file_id)
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn reset_repetitions_for_cell(
    injector: State<'_, Arc<Injector>>,
    cell_id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let cell_repository = scope.resolve::<dyn CellRepository>().await;

    let mut cell = cell_repository.get_by_id(cell_id).await?;
    cell.reset_repetitions();
    cell_repository.update(&cell).await?;
    scope.save_changes().await?;

    Ok(())
}
