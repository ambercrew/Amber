use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::card::Card;
use crate::elements::value_objects::card_parent::CardParent;
use crate::elements::value_objects::meta::Meta;

pub struct CardRow {
    pub id: Uuid,
    pub name: String,
    pub position: i64,
    pub parent_reading_id: Option<Uuid>,
    pub parent_extract_id: Option<Uuid>,
    pub parent_folder_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub front: String,
    pub back: String,
}

impl From<CardRow> for Card {
    fn from(row: CardRow) -> Self {
        let parent = if let Some(id) = row.parent_reading_id {
            CardParent::Reading(id)
        } else if let Some(id) = row.parent_extract_id {
            CardParent::Extract(id)
        } else {
            CardParent::Folder(
                row.parent_folder_id
                    .expect("card must have exactly one parent"),
            )
        };
        Card {
            meta: Meta {
                id: row.id,
                name: row.name,
                position: row.position as u32,
                created_at: row.created_at,
                modified_at: row.modified_at,
            },
            parent,
            tags: vec![],
            front: row.front,
            back: row.back,
        }
    }
}
