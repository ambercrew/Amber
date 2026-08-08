use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::study::entities::reading_review_log::ReadingReviewLog;

#[async_trait]
pub trait ReadingReviewLogRepository: Send + Sync {
    async fn create(&self, log: &ReadingReviewLog) -> Result<(), RepositoryError>;
}
