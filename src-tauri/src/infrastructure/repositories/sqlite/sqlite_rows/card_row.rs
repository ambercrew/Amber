use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::card::Card;
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::provenance::Provenance;

pub struct CardRow {
    pub id: Uuid,
    pub name: String,
    pub position: i64,
    pub parent_type: String,
    pub parent_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub removed_at: Option<DateTime<Utc>>,
    pub front: String,
    pub back: String,
}

impl From<CardRow> for Card {
    fn from(row: CardRow) -> Self {
        let parent = Provenance::from_type_and_id(&row.parent_type, row.parent_id);
        Card {
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
            front: row.front,
            back: row.back,
        }
    }
}
