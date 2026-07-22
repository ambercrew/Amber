use async_trait::async_trait;
use thiserror::Error;

use crate::common::repository_error::RepositoryError;
use crate::elements::dto::create_card_dto::CreateCardDto;
use crate::elements::dto::create_extract_dto::CreateExtractDto;
use crate::elements::dto::create_folder_dto::CreateFolderDto;
use crate::elements::dto::create_reading_dto::CreateReadingDto;
use crate::elements::services::element_move_error::ElementMoveError;
use crate::study::services::profile_resolution_service::ProfileResolutionError;

/// Creates folders, readings, extracts and cards. Beyond persisting the element
/// itself, it ensures each one gets a review row where applicable (extracts are
/// reviewed like readings) so it's immediately schedulable without a separate
/// first-review step.
#[async_trait]
pub trait ElementCreationService: Send + Sync {
    async fn create_folder(&self, dto: CreateFolderDto) -> Result<(), ElementCreationError>;
    async fn create_reading(&self, dto: CreateReadingDto) -> Result<(), ElementCreationError>;
    async fn create_extract(&self, dto: CreateExtractDto) -> Result<(), ElementCreationError>;
    async fn create_card(&self, dto: CreateCardDto) -> Result<(), ElementCreationError>;
}

#[derive(Debug, Error)]
pub enum ElementCreationError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),

    #[error(transparent)]
    Index(#[from] ElementMoveError),

    #[error(transparent)]
    ProfileResolution(#[from] ProfileResolutionError),
}
