use chrono::{DateTime, Utc};
use fractional_index::FractionalIndex;
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Meta {
    pub id: ElementId,
    pub name: String,
    pub parent: Option<ElementId>,
    pub position: FractionalIndex,
    pub tags: Vec<Uuid>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}
