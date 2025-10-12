use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::{cells::entities::review::Review, common::repository_error::RepositoryError};

#[async_trait]
pub trait ReviewRepository: Send + Sync {
    async fn create(&self, review: &Review) -> Result<(), RepositoryError>;
    async fn upsert_with_modified_date_if_modified_before(
        &self,
        review: &Review,
        date: DateTime<Utc>,
    ) -> Result<(), RepositoryError>;
}
