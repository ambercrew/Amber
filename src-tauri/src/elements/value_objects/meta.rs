use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Meta {
    pub id: Uuid,
    pub name: String,
    // The position of the element. The positions of a node do not need to be
    // increasing numbers by one, they can be arbitarly numbers as long as they
    // are different.
    pub position: u32,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}
