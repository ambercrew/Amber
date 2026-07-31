use chrono::{DateTime, Utc};

use crate::elements::value_objects::element_id::ElementId;

/// An element the user explicitly moved to the trash.
/// Descendants that went along with it are not listed separately.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TrashedElement {
    pub element_id: ElementId,
    pub name: String,
    pub trashed_at: DateTime<Utc>,
    /// Number of descendants that were trashed together with this element.
    pub descendant_count: i64,
}
