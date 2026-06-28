use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::card::Card;
use crate::elements::value_objects::{element_id::ElementId, meta::Meta};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct CardRow {
    pub id: Uuid,
    pub name: String,
    pub position: Vec<u8>,
    pub parent_reading_id: Option<Uuid>,
    pub parent_extract_id: Option<Uuid>,
    pub parent_folder_id: Option<Uuid>,
    pub parent_card_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub front: String,
    pub back: String,
}

impl From<CardRow> for Card {
    fn from(row: CardRow) -> Self {
        let parent = if let Some(id) = row.parent_reading_id {
            Some(ElementId::Reading(id))
        } else if let Some(id) = row.parent_extract_id {
            Some(ElementId::Extract(id))
        } else if let Some(id) = row.parent_folder_id {
            Some(ElementId::Folder(id))
        } else {
            row.parent_card_id.map(ElementId::Card)
        };
        Card {
            meta: Meta {
                id: row.id,
                name: row.name,
                parent,
                position: fractional_index::FractionalIndex::from_bytes(row.position)
                    .expect("Invalid fractional index"),
                created_at: row.created_at,
                modified_at: row.modified_at,
            },
            tags: vec![],
            front: row.front,
            back: row.back,
        }
    }
}
