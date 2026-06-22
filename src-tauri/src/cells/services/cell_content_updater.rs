use async_trait::async_trait;
use thiserror::Error;

use crate::{Guid, common::repository_error::RepositoryError};

#[derive(Debug, Error)]
pub enum CellContentUpdaterError {
    #[error(transparent)]
    RepositoryError(#[from] RepositoryError),
}

#[async_trait]
pub trait CellContentUpdater: Send + Sync {
    async fn update_cell_content(
        &self,
        cell_id: Guid,
        content: String,
    ) -> Result<(), CellContentUpdaterError>;
}
