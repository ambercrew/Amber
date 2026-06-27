use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::extract::Extract;
use crate::elements::value_objects::extract_parent::ExtractParent;
use crate::elements::value_objects::meta::Meta;

pub struct ExtractRow {
    pub id: Uuid,
    pub name: String,
    pub position: i64,
    pub parent_reading_id: Option<Uuid>,
    pub parent_extract_id: Option<Uuid>,
    pub parent_folder_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub text: String,
}

impl From<ExtractRow> for Extract {
    fn from(row: ExtractRow) -> Self {
        let parent = if let Some(id) = row.parent_reading_id {
            ExtractParent::Reading(id)
        } else if let Some(id) = row.parent_extract_id {
            ExtractParent::Extract(id)
        } else {
            ExtractParent::Folder(
                row.parent_folder_id
                    .expect("extract must have exactly one parent"),
            )
        };
        Extract {
            meta: Meta {
                id: row.id,
                name: row.name,
                position: row.position as u32,
                created_at: row.created_at,
                modified_at: row.modified_at,
            },
            parent,
            tags: vec![],
            text: row.text,
        }
    }
}
