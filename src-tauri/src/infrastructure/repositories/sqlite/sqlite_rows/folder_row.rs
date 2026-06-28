use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::folder::Folder;
use crate::elements::extensions::into_element_id_ext::IntoOptionalElementIdExt;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct FolderRow {
    pub id: Uuid,
    pub name: String,
    pub position: Vec<u8>,
    pub parent_id: Option<Uuid>,
    pub parent_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl From<FolderRow> for Folder {
    fn from(row: FolderRow) -> Self {
        Folder {
            meta: Meta {
                id: ElementId::Folder(row.id),
                name: row.name,
                parent: (row.parent_id, row.parent_type).into_element_id(),
                position: fractional_index::FractionalIndex::from_bytes(row.position)
                    .expect("Invalid fractional index"),
                tags: vec![],
                created_at: row.created_at,
                modified_at: row.modified_at,
            },
        }
    }
}
