use std::sync::Arc;

use crate::{
    cells::{entities::cell::Cell, repositories::cell_repository::CellRepository},
    common::api_error::ApiError,
};
use injector::injector::Injector;
use tauri::State;

#[tauri::command]
pub async fn search_cells(
    injector: State<'_, Arc<Injector>>,
    search_text: String,
) -> Result<Vec<Cell>, ApiError> {
    let scope = injector.start_scope();
    let cells = scope
        .resolve::<dyn CellRepository>()
        .await
        .search_cells(&search_text)
        .await?;
    Ok(cells)
}
