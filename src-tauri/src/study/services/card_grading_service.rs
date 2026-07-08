use async_trait::async_trait;
use fsrs::FSRSError;
use thiserror::Error;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::study::entities::card_review::CardReview;
use crate::study::services::profile_resolution_service::ProfileResolutionError;
use crate::study::value_objects::rating::Rating;

#[async_trait]
pub trait CardGradingService: Send + Sync {
    async fn grade_card(
        &self,
        card_id: Uuid,
        rating: Rating,
        duration_ms: Option<u32>,
    ) -> Result<CardReview, GradeCardError>;
}

#[derive(Debug, Error)]
pub enum GradeCardError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),

    #[error(transparent)]
    ProfileResolution(#[from] ProfileResolutionError),

    #[error("FSRS scheduling failed: {0}")]
    Fsrs(#[from] FSRSError),
}
