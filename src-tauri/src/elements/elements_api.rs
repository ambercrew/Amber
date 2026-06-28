use std::sync::Arc;

use chrono::Utc;
use fractional_index::FractionalIndex;
use tauri::State;
use uuid::Uuid;

use crate::common::api_error::ApiError;
use crate::elements::dto::create_card_dto::CreateCardDto;
use crate::elements::dto::create_extract_dto::CreateExtractDto;
use crate::elements::dto::create_folder_dto::CreateFolderDto;
use crate::elements::dto::create_reading_dto::CreateReadingDto;
use crate::elements::dto::move_element_dto::MoveElementRequestDto;
use crate::elements::dto::tree_dto::NodeDto;
use crate::elements::entities::card::Card;
use crate::elements::entities::extract::Extract;
use crate::elements::entities::folder::Folder;
use crate::elements::entities::reading::Reading;
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::services::element_move_service::ElementMoveService;
use crate::elements::services::element_tree_service::ElementTreeService;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;
use crate::infrastructure::extensions::unit_of_work::UnitOfWorkExt;
use injector::injector::Injector;

#[tauri::command]
pub async fn get_element_tree(
    injector: State<'_, Arc<Injector>>,
) -> Result<Vec<NodeDto>, ApiError> {
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
        .resolve::<dyn MetaRepository>()
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
        .resolve::<dyn MetaRepository>()
        .await
        .rename(element_id, new_name)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn create_folder(
    injector: State<'_, Arc<Injector>>,
    dto: CreateFolderDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let now = Utc::now();
    let folder = Folder {
        meta: Meta {
            id: Uuid::new_v4(),
            name: dto.meta.name,
            parent: dto.meta.parent,
            // TODO:
            position: FractionalIndex::default(),
            tags: vec![],
            created_at: now,
            modified_at: now,
        },
    };
    scope
        .resolve::<dyn FolderRepository>()
        .await
        .create(folder)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn create_reading(
    injector: State<'_, Arc<Injector>>,
    dto: CreateReadingDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let now = Utc::now();
    let reading = Reading {
        meta: Meta {
            id: Uuid::new_v4(),
            name: dto.meta.name,
            parent: dto.meta.parent,
            // TODO:
            position: FractionalIndex::default(),
            tags: vec![],
            created_at: now,
            modified_at: now,
        },
        source: dto.source,
        body: dto.body,
    };
    scope
        .resolve::<dyn ReadingRepository>()
        .await
        .create(reading)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn create_extract(
    injector: State<'_, Arc<Injector>>,
    dto: CreateExtractDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let now = Utc::now();
    let extract = Extract {
        meta: Meta {
            id: Uuid::new_v4(),
            name: dto.meta.name,
            parent: dto.meta.parent,
            // TODO:
            position: FractionalIndex::default(),
            tags: vec![],
            created_at: now,
            modified_at: now,
        },
        text: dto.text,
    };
    scope
        .resolve::<dyn ExtractRepository>()
        .await
        .create(extract)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn element_exists(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
) -> Result<bool, ApiError> {
    let scope = injector.start_scope();
    let result = scope
        .resolve::<dyn MetaRepository>()
        .await
        .exists(element_id)
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn create_card(
    injector: State<'_, Arc<Injector>>,
    dto: CreateCardDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let now = Utc::now();
    let card = Card {
        meta: Meta {
            id: Uuid::new_v4(),
            name: dto.meta.name,
            parent: dto.meta.parent,
            // TODO:
            position: FractionalIndex::default(),
            tags: vec![],
            created_at: now,
            modified_at: now,
        },
        front: dto.front,
        back: dto.back,
    };
    scope
        .resolve::<dyn CardRepository>()
        .await
        .create(card)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn move_element(
    injector: State<'_, Arc<Injector>>,
    dto: MoveElementRequestDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn ElementMoveService>()
        .await
        .move_element(dto)
        .await?;
    scope.save_changes().await?;
    Ok(())
}
