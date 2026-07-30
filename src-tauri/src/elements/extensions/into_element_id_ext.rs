use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

pub trait IntoElementIdExt {
    fn into_element_id(self) -> ElementId;
}

/// Rebuilds an [`ElementId`] from the `(element_id, element_type)` pair every
/// element row carries. Unknown type strings fall back to `Card`, matching how
/// the element tables themselves are keyed.
impl IntoElementIdExt for (Uuid, String) {
    fn into_element_id(self) -> ElementId {
        match self.1.as_str() {
            "folder" => ElementId::Folder(self.0),
            "reading" => ElementId::Reading(self.0),
            "extract" => ElementId::Extract(self.0),
            _ => ElementId::Card(self.0),
        }
    }
}

pub trait IntoOptionalElementIdExt {
    fn into_element_id(self) -> Option<ElementId>;
}

impl IntoOptionalElementIdExt for (Option<Uuid>, Option<String>) {
    fn into_element_id(self) -> Option<ElementId> {
        match (self.0, self.1.as_deref()) {
            (Some(id), Some("folder")) => Some(ElementId::Folder(id)),
            (Some(id), Some("reading")) => Some(ElementId::Reading(id)),
            (Some(id), Some("extract")) => Some(ElementId::Extract(id)),
            (Some(id), Some("card")) => Some(ElementId::Card(id)),
            _ => None,
        }
    }
}
