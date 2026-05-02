use async_trait::async_trait;
use thiserror::Error;

use crate::{Guid, common::repository_error::RepositoryError};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum CellDeleterError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait CellDeleter: Send + Sync {
    async fn delete_by_id(&self, id: Guid) -> Result<(), CellDeleterError>;
}
