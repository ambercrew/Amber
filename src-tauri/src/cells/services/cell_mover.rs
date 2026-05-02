use async_trait::async_trait;
use thiserror::Error;

use crate::{Guid, common::repository_error::RepositoryError};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum CellMoverError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait CellMover: Send + Sync {
    async fn move_cell(&self, id: Guid, new_index: u32) -> Result<(), CellMoverError>;
}
