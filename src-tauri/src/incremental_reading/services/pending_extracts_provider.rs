use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid, common::repository_error::RepositoryError,
    incremental_reading::dto::pending_extract_dto::PendingExtractDto,
};

#[derive(Debug, Error)]
pub enum PendingExtractsProviderError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("Failed to parse incremental reading content: {0}")]
    InvalidContent(String),
}

#[async_trait]
pub trait PendingExtractsProvider: Send + Sync {
    async fn get_with_content(
        &self,
        cell_id: Guid,
    ) -> Result<Vec<PendingExtractDto>, PendingExtractsProviderError>;
}
