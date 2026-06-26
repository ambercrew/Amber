use uuid::Uuid;

use super::traits::{Categorized, Derived, Element};
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::provenance::Provenance;

/// The active-recall element reviewed during sessions. `front` and `back` are
/// both HTML, copied so they can be edited independently of the parent.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Card {
    pub meta: Meta,
    pub concepts: Vec<Uuid>,
    pub parent: Provenance,
    pub front: String,
    pub back: String,
}

impl Element for Card {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}

impl Categorized for Card {
    fn concepts(&self) -> &[Uuid] {
        &self.concepts
    }
}

impl Derived for Card {
    fn parent(&self) -> Provenance {
        self.parent
    }
}
