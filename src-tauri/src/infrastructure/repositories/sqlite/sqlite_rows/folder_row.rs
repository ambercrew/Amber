use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::folder::Folder;
use crate::elements::value_objects::meta::Meta;

pub struct FolderRow {
    pub id: Uuid,
    pub name: String,
    pub position: i64,
    pub parent_folder_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub removed_at: Option<DateTime<Utc>>,
}

impl From<FolderRow> for Folder {
    fn from(row: FolderRow) -> Self {
        Folder {
            meta: Meta {
                id: row.id,
                name: row.name,
                position: row.position as u32,
                created_at: row.created_at,
                modified_at: row.modified_at,
                removed_at: row.removed_at,
            },
            parent_folder_id: row.parent_folder_id,
            tags: vec![],
        }
    }
}
