use std::sync::Arc;

use tauri::State;
use uuid::Uuid;

use crate::common::api_error::ApiError;
use crate::elements::dto::any_element_dto::AnyElementDto;
use crate::elements::dto::create_card_dto::CreateCardDto;
use crate::elements::dto::create_extract_dto::CreateExtractDto;
use crate::elements::dto::create_folder_dto::CreateFolderDto;
use crate::elements::dto::create_reading_dto::CreateReadingDto;
use crate::elements::dto::element_details_dto::ElementDetailsResponseDto;
use crate::elements::dto::move_element_dto::MoveElementRequestDto;
use crate::elements::dto::reading_split_id_dto::ReadingSplitIdDto;
use crate::elements::dto::reading_split_meta_dto::ReadingSplitMetaDto;
use crate::elements::dto::tag_dto::TagResponseDto;
use crate::elements::dto::tree_dto::NodeDto;
use crate::elements::dto::update_card_dto::UpdateCardDto;
use crate::elements::dto::update_extract_dto::UpdateExtractDto;
use crate::elements::dto::update_reading_dto::UpdateReadingDto;
use crate::elements::dto::update_reading_position_dto::UpdateReadingPositionDto;
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::services::element_creation_service::ElementCreationService;
use crate::elements::services::element_details_service::ElementDetailsService;
use crate::elements::services::element_move_service::ElementMoveService;
use crate::elements::services::element_tree_service::ElementTreeService;
use crate::elements::value_objects::element_id::ElementId;
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
    scope
        .resolve::<dyn ElementCreationService>()
        .await
        .create_folder(dto)
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
    scope
        .resolve::<dyn ElementCreationService>()
        .await
        .create_reading(dto)
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
    scope
        .resolve::<dyn ElementCreationService>()
        .await
        .create_extract(dto)
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
    scope
        .resolve::<dyn ElementCreationService>()
        .await
        .create_card(dto)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_reading(
    injector: State<'_, Arc<Injector>>,
    dto: UpdateReadingDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn ReadingRepository>()
        .await
        .update_content(dto.split_id.into(), dto.content)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn get_reading_split_manifest(
    injector: State<'_, Arc<Injector>>,
    reading_id: Uuid,
) -> Result<Vec<ReadingSplitMetaDto>, ApiError> {
    let scope = injector.start_scope();
    let manifest = scope
        .resolve::<dyn ReadingRepository>()
        .await
        .get_split_manifest(reading_id)
        .await?;
    Ok(manifest
        .into_iter()
        .map(ReadingSplitMetaDto::from)
        .collect())
}

#[tauri::command]
pub async fn get_reading_split_content(
    injector: State<'_, Arc<Injector>>,
    dto: ReadingSplitIdDto,
) -> Result<String, ApiError> {
    let scope = injector.start_scope();
    let content = scope
        .resolve::<dyn ReadingRepository>()
        .await
        .get_split_content(dto.into())
        .await?;
    Ok(content)
}

#[tauri::command]
pub async fn update_reading_position(
    injector: State<'_, Arc<Injector>>,
    dto: UpdateReadingPositionDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn ReadingRepository>()
        .await
        .update_position(dto.reading_id, dto.position)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_extract(
    injector: State<'_, Arc<Injector>>,
    dto: UpdateExtractDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn ExtractRepository>()
        .await
        .update_content(dto.id, dto.content)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_a_factor(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
    a_factor: f32,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    match element_id {
        ElementId::Reading(id) => {
            scope
                .resolve::<dyn ReadingRepository>()
                .await
                .update_a_factor(id, a_factor)
                .await?;
        }
        ElementId::Extract(id) => {
            scope
                .resolve::<dyn ExtractRepository>()
                .await
                .update_a_factor(id, a_factor)
                .await?;
        }
        _ => {
            return Err(ApiError::new(
                "a_factor is only valid for readings and extracts".to_string(),
            ));
        }
    }
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_card(
    injector: State<'_, Arc<Injector>>,
    dto: UpdateCardDto,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn CardRepository>()
        .await
        .update_content(dto.id, dto.front, dto.back)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn update_element_tags(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
    tags: Vec<String>,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn MetaRepository>()
        .await
        .update_tags(element_id, tags)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn clear_derived_from(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn MetaRepository>()
        .await
        .clear_derived_from(element_id)
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

#[tauri::command]
pub async fn get_element_by_id(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
) -> Result<AnyElementDto, ApiError> {
    let scope = injector.start_scope();
    let mut dto: AnyElementDto = match element_id {
        ElementId::Folder(_) => scope
            .resolve::<dyn FolderRepository>()
            .await
            .get_by_id(element_id.id())
            .await?
            .into(),
        ElementId::Reading(_) => scope
            .resolve::<dyn ReadingRepository>()
            .await
            .get_by_id(element_id.id())
            .await?
            .into(),
        ElementId::Extract(_) => scope
            .resolve::<dyn ExtractRepository>()
            .await
            .get_by_id(element_id.id())
            .await?
            .into(),
        ElementId::Card(_) => scope
            .resolve::<dyn CardRepository>()
            .await
            .get_by_id(element_id.id())
            .await?
            .into(),
    };

    let tags = scope
        .resolve::<dyn MetaRepository>()
        .await
        .get_tags(element_id)
        .await?
        .into_iter()
        .map(TagResponseDto::from)
        .collect();

    dto.meta_mut().tags = tags;

    Ok(dto)
}

#[tauri::command]
pub async fn get_element_details(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
) -> Result<ElementDetailsResponseDto, ApiError> {
    let scope = injector.start_scope();
    let details = scope
        .resolve::<dyn ElementDetailsService>()
        .await
        .get_element_details(element_id)
        .await?;
    Ok(details.into())
}
