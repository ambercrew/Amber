use fractional_index::FractionalIndex;

use crate::elements::value_objects::element_id::ElementId;

/// An [`ElementId`] paired with its global [`Meta::priority`](super::meta::Meta::priority),
/// so callers that need to order elements by priority don't have to look up
/// each element's `Meta` separately.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ElementIdWithPriority {
    pub element_id: ElementId,
    pub priority: FractionalIndex,
}
