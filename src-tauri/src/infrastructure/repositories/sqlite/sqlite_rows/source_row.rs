use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::sources::entities::source::Source;
use crate::sources::value_objects::source_type::SourceType;

pub struct SourceRow {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub title: String,
    pub authors: Option<String>,
    pub publication_date: Option<String>,
    pub source_type: String,
    pub location: Option<String>,
}

impl From<SourceRow> for Source {
    fn from(row: SourceRow) -> Self {
        Source {
            id: row.id,
            created_at: row.created_at,
            modified_at: row.modified_at,
            title: row.title,
            authors: row.authors,
            publication_date: row.publication_date,
            source_type: SourceType::from(row.source_type),
            location: row.location,
        }
    }
}
