use std::sync::Arc;

use crate::{
    Guid,
    cells::{
        dto::{
            cell_with_fsrs_profile_id_dto::CellWithFsrsProfileIdDto,
            create_cell_request_dto::CreateCellRequestDto,
            update_cell_request_dto::UpdateCellRequestDto,
        },
        entities::cell::Cell,
        repositories::cell_repository::CellRepository,
        services::{
            cell_creator::CellCreator, cell_deleter::CellDeleter,
            cell_fsrs_provider::CellFsrsProvider, cell_mover::CellMover,
        },
    },
    common::api_error::ApiError,
    infrastructure::extensions::unit_of_work::UnitOfWorkExt,
};
use injector::injector::Injector;
use tauri::State;

#[tauri::command]
pub async fn get_file_cells_ordered_by_index(
    injector: State<'_, Arc<Injector>>,
    file_id: Guid,
) -> Result<Vec<Cell>, ApiError> {
    let scope = injector.start_scope();
    let result = scope
        .resolve::<dyn CellRepository>()
        .await
        .get_file_cells_ordered_by_index(file_id)
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn create_cell(
    injector: State<'_, Arc<Injector>>,
    request: CreateCellRequestDto,
) -> Result<Guid, ApiError> {
    let scope = injector.start_scope();
    let id = scope
        .resolve::<dyn CellCreator>()
        .await
        .create_cell(request)
        .await?;
    scope.save_changes().await?;
    Ok(id)
}

#[tauri::command]
pub async fn delete_cell(injector: State<'_, Arc<Injector>>, id: Guid) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn CellDeleter>()
        .await
        .delete_by_id(id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn move_cell(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
    new_index: u32,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn CellMover>()
        .await
        .move_cell(id, new_index)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_cells_contents(
    injector: State<'_, Arc<Injector>>,
    requests: Vec<UpdateCellRequestDto>,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let cell_repository = scope.resolve::<dyn CellRepository>().await;

    for request in requests {
        let mut cell = cell_repository.get_by_id(request.id).await?;
        cell.set_content(request.content);
        cell_repository.update(&cell).await?;
    }
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn get_cells_for_files_with_fsrs_profile_ids(
    injector: State<'_, Arc<Injector>>,
    file_ids: Vec<Guid>,
) -> Result<Vec<CellWithFsrsProfileIdDto>, ApiError> {
    let scope = injector.start_scope();
    let result = scope
        .resolve::<dyn CellFsrsProvider>()
        .await
        .get_cells_with_fsrs_profile_ids(file_ids)
        .await?;
    Ok(result)
}
