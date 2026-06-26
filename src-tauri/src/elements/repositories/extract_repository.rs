use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::extract::Extract;

#[async_trait]
pub trait ExtractRepository: Send + Sync {
    async fn get_all(&self) -> Result<Vec<Extract>, RepositoryError>;
}
