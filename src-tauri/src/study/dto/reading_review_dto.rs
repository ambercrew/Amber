use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::elements::value_objects::element_id::ElementId;
use crate::study::entities::reading_review::ReadingReview;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingReviewResponseDto {
    pub element_id: ElementId,
    pub due: DateTime<Utc>,
    pub interval_days: f32,
    pub last_reviewed: Option<DateTime<Utc>>,
    pub finished_at: Option<DateTime<Utc>>,
}

impl From<ReadingReview> for ReadingReviewResponseDto {
    fn from(review: ReadingReview) -> Self {
        ReadingReviewResponseDto {
            element_id: review.element_id,
            due: review.due,
            interval_days: review.interval_days,
            last_reviewed: review.last_reviewed,
            finished_at: review.finished_at,
        }
    }
}
