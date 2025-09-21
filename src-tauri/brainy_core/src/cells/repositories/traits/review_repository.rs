use async_trait::async_trait;

use crate::{cells::entities::review::Review, common::repository_error::RepositoryError};

#[async_trait]
pub trait ReviewRepository: Send + Sync {
    async fn create(&self, review: &Review) -> Result<(), RepositoryError>;
}
