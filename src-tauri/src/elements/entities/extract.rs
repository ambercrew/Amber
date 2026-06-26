use uuid::Uuid;

use super::traits::{Derived, Element, Tagged};
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::provenance::Provenance;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Extract {
    pub meta: Meta,
    pub parent: Provenance,
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
    fn parent(&self) -> Provenance {
        self.parent
    }
}
