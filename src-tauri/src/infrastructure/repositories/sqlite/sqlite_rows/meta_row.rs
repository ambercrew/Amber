use chrono::{DateTime, Utc};
use fractional_index::FractionalIndex;
use uuid::Uuid;

use crate::elements::{
    extensions::into_element_id_ext::IntoOptionalElementIdExt, value_objects::meta::Meta,
};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct MetaRow {
    pub id: Uuid,
    pub name: String,
    pub position: Vec<u8>,
    pub parent_id: Option<Uuid>,
    pub parent_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl From<MetaRow> for Meta {
    fn from(row: MetaRow) -> Self {
        Meta {
            id: row.id,
            name: row.name,
            parent: (row.parent_id, row.parent_type).into_element_id(),
            position: FractionalIndex::from_bytes(row.position).expect("Invalid fractional index"),
            tags: vec![],
            created_at: row.created_at,
            modified_at: row.modified_at,
        }
    }
}
