use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Identity + lifecycle shared by every element. `removed_at` implements soft
/// deletion: a removed element retains its history rather than vanishing.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Meta {
    pub id: Uuid,
    pub title: String,
    pub position: u32,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub removed_at: Option<DateTime<Utc>>,
}
