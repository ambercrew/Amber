use chrono::{DateTime, Utc};

use crate::elements::entities::tag::Tag;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct TagRow {
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl From<TagRow> for Tag {
    fn from(row: TagRow) -> Self {
        Tag {
            name: row.name,
            created_at: row.created_at,
            modified_at: row.modified_at,
        }
    }
}
