use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::elements::entities::reading::Reading;
use crate::elements::extensions::into_element_id_ext::IntoOptionalElementIdExt;
use crate::elements::value_objects::element_id::ElementId;
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
    pub body: String,
}

impl From<ReadingRow> for Reading {
    fn from(row: ReadingRow) -> Self {
        Reading {
            meta: Meta {
                element_id: ElementId::Reading(row.id),
                name: row.name,
                parent: (row.parent_id, row.parent_type).into_element_id(),
                position: fractional_index::FractionalIndex::from_bytes(row.position)
                    .expect("Invalid fractional index"),
                created_at: row.created_at,
                modified_at: row.modified_at,
            },
            body: row.body,
        }
    }
}
