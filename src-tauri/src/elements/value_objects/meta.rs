use chrono::{DateTime, Utc};
use fractional_index::FractionalIndex;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Meta {
    pub element_id: ElementId,
    pub name: String,
    pub parent: Option<ElementId>,
    pub position: FractionalIndex,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}
