use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::extract::Extract;
use crate::elements::repositories::element_repository::ElementRepository;

#[async_trait]
pub trait ExtractRepository: ElementRepository + Send + Sync {
    async fn get_all(&self) -> Result<Vec<Extract>, RepositoryError>;
}
