use std::sync::Arc;

use tauri::State;

use crate::common::api_error::ApiError;
use crate::elements::dto::tree_dto::FolderNodeDto;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::services::element_tree_service::ElementTreeService;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::extensions::unit_of_work::UnitOfWorkExt;
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

#[tauri::command]
pub async fn delete_element(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn ElementRepository>()
        .await
        .delete(element_id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn rename_element(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
    new_name: String,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn ElementRepository>()
        .await
        .rename(element_id, new_name)
        .await?;
    scope.save_changes().await?;
    Ok(())
}
