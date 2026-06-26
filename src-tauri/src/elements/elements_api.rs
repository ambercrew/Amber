use std::sync::Arc;

use tauri::State;

use crate::common::api_error::ApiError;
use crate::elements::dto::tree_dto::FolderNodeDto;
use crate::elements::services::element_tree_service::ElementTreeService;
use injector::injector::Injector;

#[tauri::command]
pub async fn get_element_tree(
    injector: State<'_, Arc<Injector>>,
) -> Result<Vec<FolderNodeDto>, ApiError> {
    let scope = injector.start_scope();
    let result = scope
        .resolve::<dyn ElementTreeService>()
        .await
        .get_element_tree()
        .await?;
    Ok(result)
}
