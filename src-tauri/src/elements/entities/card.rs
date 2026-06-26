use uuid::Uuid;

use super::traits::{Derived, Element, Tagged};
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::provenance::Provenance;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Card {
    pub meta: Meta,
    pub parent: Provenance,
    pub tags: Vec<Uuid>,
    pub front: String,
    pub back: String,
}

impl Element for Card {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}

impl Tagged for Card {
    fn tags(&self) -> &[Uuid] {
        &self.tags
    }
}

impl Derived for Card {
    fn parent(&self) -> Provenance {
        self.parent
    }
}
