use std::sync::Arc;

use tauri::State;
use uuid::Uuid;

use crate::common::api_error::ApiError;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::extensions::unit_of_work::UnitOfWorkExt;
use crate::sources::dto::source_dto::{SourceRequestDto, SourceResponseDto};
use crate::sources::services::source_service::{SourceService, SourceWithElementCount};
use injector::injector::Injector;

#[tauri::command]
pub async fn list_sources(
    injector: State<'_, Arc<Injector>>,
) -> Result<Vec<SourceResponseDto>, ApiError> {
    let scope = injector.start_scope();
    let sources = scope
        .resolve::<dyn SourceService>()
        .await
        .list_sources()
        .await?;
    Ok(sources.into_iter().map(SourceResponseDto::from).collect())
}

#[tauri::command]
pub async fn get_source(
    injector: State<'_, Arc<Injector>>,
    id: Uuid,
) -> Result<SourceResponseDto, ApiError> {
    let scope = injector.start_scope();
    let source = scope
        .resolve::<dyn SourceService>()
        .await
        .get_source(id)
        .await?;
    Ok(source.into())
}

#[tauri::command]
pub async fn create_source(
    injector: State<'_, Arc<Injector>>,
    dto: SourceRequestDto,
) -> Result<SourceResponseDto, ApiError> {
    let scope = injector.start_scope();
    let source = scope
        .resolve::<dyn SourceService>()
        .await
        .create_or_reuse_source(dto.into())
        .await?;
    scope.save_changes().await?;
    Ok(SourceWithElementCount {
        source,
        element_count: 0,
    }
    .into())
}

#[tauri::command]
pub async fn update_source(
    injector: State<'_, Arc<Injector>>,
    id: Uuid,
    dto: SourceRequestDto,
) -> Result<SourceResponseDto, ApiError> {
    let scope = injector.start_scope();
    let service = scope.resolve::<dyn SourceService>().await;
    let source = service.update_source(id, dto.into()).await?;
    let element_count = service.get_source(source.id).await?.element_count;
    scope.save_changes().await?;
    Ok(SourceWithElementCount {
        source,
        element_count,
    }
    .into())
}

#[tauri::command]
pub async fn delete_source(injector: State<'_, Arc<Injector>>, id: Uuid) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn SourceService>()
        .await
        .delete_source(id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn assign_source(
    injector: State<'_, Arc<Injector>>,
    element_id: ElementId,
    source_id: Option<Uuid>,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<dyn SourceService>()
        .await
        .assign_source(element_id, source_id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}
