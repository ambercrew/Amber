use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::reading::{Reading, ReadingSource};
use crate::elements::extensions::into_element_id_ext::IntoOptionalElementIdExt;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct ReadingRow {
    pub id: Uuid,
    pub name: String,
    pub position: Vec<u8>,
    pub parent_id: Option<Uuid>,
    pub parent_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub source_type: String,
    pub source_url: Option<String>,
    pub body: String,
}

impl From<ReadingRow> for Reading {
    fn from(row: ReadingRow) -> Self {
        let source = match row.source_type.as_str() {
            "website" => ReadingSource::Website {
                url: row.source_url.unwrap_or_default(),
            },
            "pdf" => ReadingSource::Pdf,
            _ => ReadingSource::Clipboard,
        };
        Reading {
            meta: Meta {
                id: row.id,
                name: row.name,
                parent: (row.parent_id, row.parent_type).into_element_id(),
                position: fractional_index::FractionalIndex::from_bytes(row.position)
                    .expect("Invalid fractional index"),
                tags: vec![],
                created_at: row.created_at,
                modified_at: row.modified_at,
            },
            source,
            body: row.body,
        }
    }
}
