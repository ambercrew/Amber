use async_trait::async_trait;
use thiserror::Error;

use crate::{Guid, common::repository_error::RepositoryError};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FsrsProfileDeleterError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),

    #[error("Cannot delete the last profile, please create another one first")]
    CannotDeleteLastProfile,
}

#[async_trait]
pub trait FsrsProfileDeleter: Send + Sync {
    async fn delete_by_id(&self, id: Guid) -> Result<(), FsrsProfileDeleterError>;
}
