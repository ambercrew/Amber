use std::sync::Arc;

use crate::{
    Guid,
    cells::{
        cell_service::CellService,
        entities::cell::{Cell, CellType},
        repositories::cell_repository::CellRepository,
    },
    common::repository_error::RepositoryError,
    file_system::{
        repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
        value_objects::fsrs_profile_choice::FsrsProfileChoice,
    },
    infrastructure::extensions::unit_of_work::UnitOfWorkExt,
};
use crate::{
    cells::dto::{
        cell_with_fsrs_profile_id::CellWithFsrsProfileId, update_cell_request::UpdateCellRequest,
    },
    common::api_error::ApiError,
};
use injector::{injector::Injector, injector_scope::InjectorScope};
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
    file_id: Guid,
    content: String,
    cell_type: CellType,
    index: u32,
) -> Result<Guid, ApiError> {
    let scope = injector.start_scope();
    let id = scope
        .resolve::<CellService>()
        .await
        .create_cell(file_id, content, cell_type, index)
        .await?;
    scope.save_changes().await?;
    Ok(id)
}

#[tauri::command]
pub async fn delete_cell(injector: State<'_, Arc<Injector>>, id: Guid) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<CellService>()
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
        .resolve::<CellService>()
        .await
        .move_cell(id, new_index)
        .await
        .unwrap();
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_cells_contents(
    injector: State<'_, Arc<Injector>>,
    requests: Vec<UpdateCellRequest>,
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
) -> Result<Vec<CellWithFsrsProfileId>, ApiError> {
    let scope = injector.start_scope();
    let file_repository = scope.resolve::<dyn FileRepository>().await;
    let cell_repository = scope.resolve::<dyn CellRepository>().await;

    let mut result = Vec::new();

    for file_id in file_ids {
        let file = file_repository.get_by_id(file_id).await?;

        let fsrs_profile_id = get_fsrs_profile_id_for_item_recursively(
            &scope,
            file.fsrs_profile_choice(),
            file.parent_id(),
        )
        .await?;

        let mut cells = cell_repository
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
    scope: &InjectorScope<'_>,
    mut fsrs_profile_choice: FsrsProfileChoice,
    mut parent_id: Option<Guid>,
) -> Result<Guid, RepositoryError> {
    let folder_repository = scope.resolve::<dyn FolderRepository>().await;

    while FsrsProfileChoice::Inherit == fsrs_profile_choice {
        let parent = folder_repository.get_by_id(parent_id.unwrap()).await?;
        fsrs_profile_choice = parent.fsrs_profile_choice();
        parent_id = parent.parent_id();
    }

    if let FsrsProfileChoice::Id(id) = fsrs_profile_choice {
        return Ok(id);
    }

    unreachable!()
}
