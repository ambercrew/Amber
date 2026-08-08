use chrono::{DateTime, Utc};

use crate::elements::value_objects::element_id::ElementId;

/// Shared by `Reading` and `Extract` elements.
#[derive(Debug, Clone, PartialEq)]
pub struct ReadingReview {
    pub element_id: ElementId,
    pub due: DateTime<Utc>,
    pub interval_days: f32,
    pub last_reviewed: Option<DateTime<Utc>>,
    pub finished_at: Option<DateTime<Utc>>,
}
