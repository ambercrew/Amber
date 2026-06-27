use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::reading::{Reading, ReadingSource};
use crate::elements::value_objects::meta::Meta;

pub struct ReadingRow {
    pub id: Uuid,
    pub name: String,
    pub position: i64,
    pub folder_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub source_type: String,
    pub source_url: Option<String>,
    pub body: String,
}

impl From<ReadingRow> for Reading {
    fn from(row: ReadingRow) -> Self {
        let source = match row.source_type.as_str() {
            "article" => ReadingSource::Article {
                url: row.source_url.unwrap_or_default(),
            },
            "pdf" => ReadingSource::Pdf,
            _ => ReadingSource::Clipboard,
        };
        Reading {
            meta: Meta {
                id: row.id,
                name: row.name,
                position: row.position as u32,
                created_at: row.created_at,
                modified_at: row.modified_at,
            },
            folder_id: row.folder_id,
            tags: vec![],
            source,
            body: row.body,
        }
    }
}
