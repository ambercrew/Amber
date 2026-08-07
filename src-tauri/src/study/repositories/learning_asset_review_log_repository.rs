use async_trait::async_trait;

use crate::common::repository_error::RepositoryError;
use crate::study::entities::learning_asset_review_log::LearningAssetReviewLog;

#[async_trait]
pub trait LearningAssetReviewLogRepository: Send + Sync {
    async fn create(&self, log: &LearningAssetReviewLog) -> Result<(), RepositoryError>;
}
