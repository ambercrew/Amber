use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid, cells::dto::create_cell_request_dto::CreateCellRequestDto,
    common::repository_error::RepositoryError,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum CellCreatorError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait CellCreator: Send + Sync {
    async fn create_cell(&self, request: CreateCellRequestDto) -> Result<Guid, CellCreatorError>;
}
