use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

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
