use std::sync::Arc;

use crate::{
    cells::entities::cell::Cell,
    common::{api_error::ApiError, traits::repositories_context::RepositoriesContext},
};
use tauri::State;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn search_cells(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    search_text: String,
) -> Result<Vec<Cell>, ApiError> {
    let context = context.lock().await;
    let cells = context.cell_repository().search_cells(&search_text).await?;
    Ok(cells)
}
