use async_trait::async_trait;
use thiserror::Error;

use crate::{
    common::repository_error::RepositoryError,
    file_system::dto::review_tree_folder_dto::ReviewTreeFolderDto,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum ReviewTreeBuilderError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait ReviewTreeBuilder: Send + Sync {
    async fn build(&self) -> Result<ReviewTreeFolderDto, ReviewTreeBuilderError>;
}
