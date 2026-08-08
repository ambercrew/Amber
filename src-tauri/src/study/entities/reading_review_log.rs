use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::study::value_objects::reading_action::ReadingAction;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReadingReviewLog {
    pub id: Uuid,
    pub element_id: Option<Uuid>,
    pub reviewed_at: DateTime<Utc>,
    pub action: ReadingAction,
}
