use chrono::{DateTime, Utc};
use fractional_index::FractionalIndex;
use uuid::Uuid;

use crate::elements::{
    extensions::into_element_id_ext::IntoOptionalElementIdExt,
    value_objects::{element_id::ElementId, meta::Meta},
};

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct MetaRow {
    pub element_id: Uuid,
    pub element_type: String,
    pub name: String,
    pub position: Vec<u8>,
    pub parent_id: Option<Uuid>,
    pub parent_type: Option<String>,
    pub study_profile_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl From<MetaRow> for Meta {
    fn from(row: MetaRow) -> Self {
        let element_id = match row.element_type.as_str() {
            "folder" => ElementId::Folder(row.element_id),
            "reading" => ElementId::Reading(row.element_id),
            "extract" => ElementId::Extract(row.element_id),
            _ => ElementId::Card(row.element_id),
        };
        Meta {
            element_id,
            name: row.name,
            parent: (row.parent_id, row.parent_type).into_element_id(),
            position: FractionalIndex::from_bytes(row.position).expect("Invalid fractional index"),
            study_profile_id: row.study_profile_id,
            created_at: row.created_at,
            modified_at: row.modified_at,
        }
    }
}
