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
    /// Resolves the effective [`FsrsProfile`] for an item.
    ///
    /// When `fsrs_profile_choice` is [`FsrsProfileChoice::Inherit`], the resolver
    /// walks up the folder hierarchy via `parent_id` until it finds an ancestor
    /// with an explicit profile. If the root is reached without finding one, a
    /// default profile is created and assigned to the root folder automatically.
    async fn get_for_item(
        &self,
        fsrs_profile_choice: FsrsProfileChoice,
        parent_id: Option<Guid>,
    ) -> Result<FsrsProfile, FsrsProfileResolverError>;
}
