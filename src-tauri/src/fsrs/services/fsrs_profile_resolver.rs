use async_trait::async_trait;
use thiserror::Error;

use crate::{
    Guid, common::repository_error::RepositoryError,
    file_system::value_objects::fsrs_profile_choice::FsrsProfileChoice,
    fsrs::entities::fsrs_profile::FsrsProfile,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FsrsProfileResolverError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
}

#[async_trait]
pub trait FsrsProfileResolver: Send + Sync {
    async fn get_for_item(
        &self,
        fsrs_profile_choice: FsrsProfileChoice,
        parent_id: Option<Guid>,
    ) -> Result<FsrsProfile, FsrsProfileResolverError>;
}
