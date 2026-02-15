use std::sync::Arc;

use crate::{
    Guid,
    cells::{
        cell_service::CellService,
        entities::cell::{Cell, CellType},
    },
    common::{
        repository_error::RepositoryError, traits::repositories_context::RepositoriesContext,
    },
    file_system::value_objects::fsrs_profile_choice::FsrsProfileChoice,
};
use crate::{
    cells::dto::{
        cell_with_fsrs_profile_id::CellWithFsrsProfileId, update_cell_request::UpdateCellRequest,
    },
    common::api_error::ApiError,
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
        .get_file_cells_ordered_by_index(file_id)
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
    let context = context.lock().await;
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
    let context = context.lock().await;
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
    let context = context.lock().await;
    cell_service.move_cell(id, new_index).await.unwrap();
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_cells_contents(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    requests: Vec<UpdateCellRequest>,
) -> Result<(), ApiError> {
    let context = context.lock().await;

    for request in requests {
        let mut cell = context.cell_repository().get_by_id(request.id).await?;
        cell.set_content(request.content);
        context.cell_repository().update(&cell).await?;
    }
    context.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn get_cells_for_files_with_fsrs_profile_ids(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    file_ids: Vec<Guid>,
) -> Result<Vec<CellWithFsrsProfileId>, ApiError> {
    let context = context.lock().await;
    let mut result = Vec::new();

    for file_id in file_ids {
        let file = context.file_repository().get_by_id(file_id).await?;

        let fsrs_profile_id = get_fsrs_profile_id_for_item_recursively(
            &*context,
            file.fsrs_profile_choice(),
            file.parent_id(),
        )
        .await?;

        let mut cells = context
            .cell_repository()
            .get_file_cells_ordered_by_index(file_id)
            .await?
            .into_iter()
            .map(|cell| CellWithFsrsProfileId {
                cell,
                fsrs_profile_id,
            })
            .collect::<Vec<_>>();

        result.append(&mut cells);
    }

    Ok(result)
}

async fn get_fsrs_profile_id_for_item_recursively(
    context: &dyn RepositoriesContext,
    mut fsrs_profile_choice: FsrsProfileChoice,
    mut parent_id: Option<Guid>,
) -> Result<Guid, RepositoryError> {
    while FsrsProfileChoice::Inherit == fsrs_profile_choice {
        let parent = context
            .folder_repository()
            .get_by_id(parent_id.unwrap())
            .await?;
        fsrs_profile_choice = parent.fsrs_profile_choice();
        parent_id = parent.parent_id();
    }

    if let FsrsProfileChoice::Id(id) = fsrs_profile_choice {
        return Ok(id);
    }

    unreachable!()
}
