use chrono::{DateTime, Utc};
use fractional_index::FractionalIndex;
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Meta {
    pub id: Uuid,
    pub name: String,
    pub parent: Option<ElementId>,
    // The position of the element. The positions of a node do not need to be
    // increasing numbers by one, they can be arbitarly numbers as long as they
    // are different.
    pub position: FractionalIndex,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}
