use std::sync::Arc;

use crate::{
    cells::{
        dto::update_repetition_request_dto::UpdateRepetitionRequestDto, entities::review::Rating,
        repositories::cell_repository::CellRepository, services::review_registrar::ReviewRegistrar,
        value_objects::home_statistics::HomeStatistics,
    },
    common::api_error::ApiError,
    infrastructure::extensions::unit_of_work::UnitOfWorkExt,
};
use injector::injector::Injector;
use tauri::State;

#[tauri::command]
pub async fn get_home_statistics(
    injector: State<'_, Arc<Injector>>,
) -> Result<HomeStatistics, ApiError> {
    let scope = injector.start_scope();
    let result = scope
        .resolve::<dyn CellRepository>()
        .await
        .get_home_statistics()
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn register_review(
    injector: State<'_, Arc<Injector>>,
    repetition_update: UpdateRepetitionRequestDto,
    rating: Rating,
    study_time: u32,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn ReviewRegistrar>()
        .await
        .register_review(repetition_update, rating, study_time)
        .await?;
    scope.save_changes().await?;
    Ok(())
}
