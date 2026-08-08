use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;
use crate::study::entities::reading_review::ReadingReview;

#[async_trait]
pub trait ReadingReviewRepository: Send + Sync {
    async fn get_by_element_id(
        &self,
        element_id: Uuid,
    ) -> Result<Option<ReadingReview>, RepositoryError>;

    /// Creates the review row if it doesn't exist yet, otherwise updates it in place.
    async fn upsert(&self, review: &ReadingReview) -> Result<(), RepositoryError>;

    /// Readings/extracts due on or before `as_of`, including elements that have never
    /// been reviewed. Finished elements are excluded.
    async fn get_due_element_ids(
        &self,
        as_of: DateTime<Utc>,
    ) -> Result<Vec<ElementId>, RepositoryError>;
}
