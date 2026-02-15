use std::sync::Arc;

use crate::{
    cells::{
        cell_service::CellService, entities::review::Rating,
        models::home_statistics::HomeStatistics,
        value_objects::repetition_update::RepetitionUpdate,
    },
    common::{api_error::ApiError, traits::repositories_context::RepositoriesContext},
};
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_home_statistics(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
) -> Result<HomeStatistics, ApiError> {
    let context = context.lock().await;
    let result = context.cell_repository().get_home_statistics().await?;
    Ok(result)
}

#[tauri::command]
pub async fn register_review(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    cell_service: State<'_, Arc<CellService>>,
    repetition_update: RepetitionUpdate,
    rating: Rating,
    study_time: u32,
) -> Result<(), ApiError> {
    let context = context.lock().await;
    cell_service
        .register_review(repetition_update, rating, study_time)
        .await?;
    context.save_changes().await?;
    Ok(())
}
