use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Meta {
    pub id: Uuid,
    pub name: String,
    pub position: u32,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}
