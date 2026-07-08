use async_trait::async_trait;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::study::entities::study_profile::StudyProfile;

#[async_trait]
pub trait StudyProfileRepository: Send + Sync {
    async fn create(&self, profile: &StudyProfile) -> Result<(), RepositoryError>;
    async fn update(&self, profile: &StudyProfile) -> Result<(), RepositoryError>;
    async fn delete(&self, id: Uuid) -> Result<(), RepositoryError>;
    async fn get_by_id(&self, id: Uuid) -> Result<StudyProfile, RepositoryError>;
    async fn get_all(&self) -> Result<Vec<StudyProfile>, RepositoryError>;
    async fn get_default_or_oldest(&self) -> Result<Option<StudyProfile>, RepositoryError>;

    /// Clears `is_default` on every profile. Used by set-default before
    /// marking the new default, so exactly one profile stays default.
    async fn clear_default(&self) -> Result<(), RepositoryError>;
}
