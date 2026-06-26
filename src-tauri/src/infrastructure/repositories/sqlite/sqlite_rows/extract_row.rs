use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::extract::Extract;
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::provenance::Provenance;

pub struct ExtractRow {
    pub id: Uuid,
    pub name: String,
    pub position: i64,
    pub parent_type: String,
    pub parent_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub removed_at: Option<DateTime<Utc>>,
    pub text: String,
}

impl From<ExtractRow> for Extract {
    fn from(row: ExtractRow) -> Self {
        let parent = match row.parent_type.as_str() {
            "reading" => Provenance::Reading(row.parent_id),
            "extract" => Provenance::Extract(row.parent_id),
            _ => Provenance::Folder(row.parent_id),
        };
        Extract {
            meta: Meta {
                id: row.id,
                name: row.name,
                position: row.position as u32,
                created_at: row.created_at,
                modified_at: row.modified_at,
                removed_at: row.removed_at,
            },
            parent,
            tags: vec![],
            text: row.text,
        }
    }
}
