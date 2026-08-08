use async_trait::async_trait;
use chrono::{DateTime, Utc};
use thiserror::Error;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;
use crate::study::entities::reading_review::ReadingReview;
use crate::study::services::profile_resolution_service::ProfileResolutionError;

#[async_trait]
pub trait ReadingSchedulingService: Send + Sync {
    /// Advances the element to its next interval (`interval_days * a_factor`, or
    /// `profile.initial_interval_days` on the first pass), floored by
    /// `profile.min_interval_days`.
    async fn next(&self, element_id: ElementId) -> Result<ReadingReview, ReadingSchedulingError>;

    /// Computes the due date that `next` would produce, without persisting it.
    async fn preview_next(
        &self,
        element_id: ElementId,
    ) -> Result<DateTime<Utc>, ReadingSchedulingError>;

    /// Marks the element finished. Leaves `due` and `interval_days` untouched,
    /// which is what makes undo trivial.
    async fn finish(&self, element_id: ElementId) -> Result<ReadingReview, ReadingSchedulingError>;

    /// Clears `finished_at` and resets `due` to today so the element
    /// resurfaces immediately rather than being retroactively overdue.
    async fn unfinish(
        &self,
        element_id: ElementId,
    ) -> Result<ReadingReview, ReadingSchedulingError>;
}

#[derive(Debug, Error)]
pub enum ReadingSchedulingError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),

    #[error(transparent)]
    ProfileResolution(#[from] ProfileResolutionError),

    #[error("element has never been reviewed")]
    NeverReviewed,
}
