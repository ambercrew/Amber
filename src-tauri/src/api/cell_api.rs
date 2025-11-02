use std::sync::Arc;

use crate::{api::ApiError, dto::update_cell_request::UpdateCellRequest};
use brainy_core::{
    Guid,
    cells::{
        cell_service::CellService,
        entities::cell::{Cell, CellType},
    },
    common::traits::repositories_context::RepositoriesContext,
};
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_file_cells_ordered_by_index(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_id: Guid,
) -> Result<Vec<Cell>, ApiError> {
    let context = context.lock().await;
    let result = context
        .cell_repository()
        .get_file_cells_ordered_by_index_then_created_date(file_id)
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn create_cell(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    cell_service: State<'_, Arc<CellService>>,
    file_id: Guid,
    content: String,
    cell_type: CellType,
    index: u32,
) -> Result<Guid, ApiError> {
    let mut context = context.lock().await;
    let id = cell_service
        .create_cell(file_id, content, cell_type, index)
        .await?;
    context.save_changes().await?;
    Ok(id)
}

#[tauri::command]
pub async fn delete_cell(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    cell_service: State<'_, Arc<CellService>>,
    id: Guid,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    cell_service.delete_by_id(id).await?;
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn move_cell(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    cell_service: State<'_, Arc<CellService>>,
    id: Guid,
    new_index: u32,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;
    cell_service.move_cell(id, new_index).await.unwrap();
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_cells_contents(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    requests: Vec<UpdateCellRequest>,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;

    for request in requests {
        let mut cell = context.cell_repository().get_by_id(request.id).await?;
        cell.set_content(request.content);
        context.cell_repository().update(&cell).await?;
    }
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn get_cells_for_files(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_ids: Vec<Guid>,
) -> Result<Vec<Cell>, ApiError> {
    let context = context.lock().await;
    let mut result: Vec<Cell> = Vec::new();

    for file_id in file_ids {
        let mut cells = context
            .cell_repository()
            .get_file_cells_ordered_by_index_then_created_date(file_id)
            .await?;
        result.append(&mut cells);
    }

    Ok(result)
}
