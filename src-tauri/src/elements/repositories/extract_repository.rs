use async_trait::async_trait;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::extract::Extract;

#[async_trait]
pub trait ExtractRepository: Send + Sync {
    async fn get_all(&self) -> Result<Vec<Extract>, RepositoryError>;
    async fn get_by_id(&self, id: Uuid) -> Result<Extract, RepositoryError>;
    async fn create(&self, extract: Extract) -> Result<(), RepositoryError>;
    async fn update_content(&self, id: Uuid, content: String) -> Result<(), RepositoryError>;
}
