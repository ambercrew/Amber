use async_trait::async_trait;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::sources::entities::source::Source;

#[async_trait]
pub trait SourceRepository: Send + Sync {
    async fn create(&self, source: &Source) -> Result<(), RepositoryError>;
    async fn update(&self, source: &Source) -> Result<(), RepositoryError>;
    async fn delete(&self, id: Uuid) -> Result<(), RepositoryError>;
    async fn get_by_id(&self, id: Uuid) -> Result<Source, RepositoryError>;
    async fn get_all(&self) -> Result<Vec<Source>, RepositoryError>;

    /// Looks up a source by its exact `location`, used to deduplicate
    /// re-imports of the same origin. Sources without a location are never
    /// matched.
    async fn find_by_location(&self, location: &str) -> Result<Option<Source>, RepositoryError>;
}
