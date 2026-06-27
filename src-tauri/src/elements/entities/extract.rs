use uuid::Uuid;

use super::traits::{Derived, Element, Tagged};
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::extract_parent::ExtractParent;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Extract {
    pub meta: Meta,
    pub parent: ExtractParent,
    pub tags: Vec<Uuid>,
    pub text: String,
}

impl Element for Extract {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}

impl Tagged for Extract {
    fn tags(&self) -> &[Uuid] {
        &self.tags
    }
}

impl Derived for Extract {
    fn parent(&self) -> ElementId {
        self.parent.into()
    }
}
