use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::study::value_objects::rating::Rating;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CardReviewLog {
    pub id: Uuid,
    pub card_id: Option<Uuid>,
    pub reviewed_at: DateTime<Utc>,
    pub rating: Rating,
    pub duration_ms: Option<u32>,
}
