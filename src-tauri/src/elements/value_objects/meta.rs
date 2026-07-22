use chrono::{DateTime, Utc};
use fractional_index::FractionalIndex;
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Meta {
    pub element_id: ElementId,
    pub name: String,
    pub parent: Option<ElementId>,
    pub position: FractionalIndex,
    /// The element this one was created from, one hop up the derivation chain.
    /// Independent of `parent`, which is the element's place in the sidebar tree.
    pub derived_from: Option<ElementId>,
    pub study_profile_id: Option<Uuid>,
    pub source_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}
