use chrono::{DateTime, Utc};
use fractional_index::FractionalIndex;
use uuid::Uuid;

use crate::elements::value_objects::{element_id::ElementId, meta::Meta};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct MetaRow {
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

impl From<MetaRow> for Meta {
    fn from(row: MetaRow) -> Self {
        let parent = if let Some(id) = row.parent_reading_id {
            Some(ElementId::Reading(id))
        } else if let Some(id) = row.parent_extract_id {
            Some(ElementId::Extract(id))
        } else if let Some(id) = row.parent_folder_id {
            Some(ElementId::Folder(id))
        } else {
            row.parent_card_id.map(ElementId::Card)
        };
        Meta {
            id: row.id,
            name: row.name,
            parent,
            position: FractionalIndex::from_bytes(row.position).expect("Invalid fractional index"),
            created_at: row.created_at,
            modified_at: row.modified_at,
        }
    }
}
