use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::{
    Guid, common::repository_error::RepositoryError, fsrs::entities::fsrs_profile::FsrsProfile,
};

#[async_trait]
pub trait FsrsRepository: Send + Sync {
    async fn get_by_id(&self, id: Guid) -> Result<FsrsProfile, RepositoryError>;
    async fn get_all_fsrs_profiles(&self) -> Result<Vec<FsrsProfile>, RepositoryError>;
    async fn create(&self, fsrs_profile: &FsrsProfile) -> Result<(), RepositoryError>;
    async fn update(&self, fsrs_profile: &FsrsProfile) -> Result<(), RepositoryError>;
    async fn delete_by_id(&self, id: Guid) -> Result<(), RepositoryError>;
    async fn upsert_with_modified_date_if_modified_before(
        &self,
        fsrs_profile: &FsrsProfile,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError>;
    async fn get_all_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<FsrsProfile>, RepositoryError>;
}
