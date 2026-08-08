use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::study::entities::card_review_log::CardReviewLog;

#[async_trait]
pub trait CardReviewLogRepository: Send + Sync {
    async fn create(&self, log: &CardReviewLog) -> Result<(), RepositoryError>;
}
