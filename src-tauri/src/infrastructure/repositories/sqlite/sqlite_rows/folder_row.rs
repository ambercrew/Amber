use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::folder::Folder;
use crate::elements::value_objects::{element_id::ElementId, meta::Meta};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct FolderRow {
    pub id: Uuid,
    pub name: String,
    pub position: Vec<u8>,
    pub parent_reading_id: Option<Uuid>,
    pub parent_extract_id: Option<Uuid>,
    pub parent_folder_id: Option<Uuid>,
    pub parent_card_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl From<FolderRow> for Folder {
    fn from(row: FolderRow) -> Self {
        let parent = if let Some(id) = row.parent_reading_id {
            Some(ElementId::Reading(id))
        } else if let Some(id) = row.parent_extract_id {
            Some(ElementId::Extract(id))
        } else if let Some(id) = row.parent_folder_id {
            Some(ElementId::Folder(id))
        } else {
            row.parent_card_id.map(ElementId::Card)
        };
        Folder {
            meta: Meta {
                id: row.id,
                name: row.name,
                parent,
                position: fractional_index::FractionalIndex::from_bytes(row.position)
                    .expect("Invalid fractional index"),
                tags: vec![],
                created_at: row.created_at,
                modified_at: row.modified_at,
            },
        }
    }
}
