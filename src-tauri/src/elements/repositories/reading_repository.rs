use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::reading::Reading;

#[async_trait]
pub trait ReadingRepository: Send + Sync {
    async fn get_all(&self) -> Result<Vec<Reading>, RepositoryError>;
    async fn create(&self, reading: Reading) -> Result<(), RepositoryError>;
}
