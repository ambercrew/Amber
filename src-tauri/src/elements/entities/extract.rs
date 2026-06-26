use uuid::Uuid;

use super::traits::{Categorized, Derived, Element};
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::provenance::Provenance;

/// A passage derived from a Reading or another Extract by highlighting.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Extract {
    pub meta: Meta,
    pub concepts: Vec<Uuid>,
    pub parent: Provenance,
    /// The extracted passage, copied as HTML.
    pub text: String,
}

impl Element for Extract {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}

impl Categorized for Extract {
    fn concepts(&self) -> &[Uuid] {
        &self.concepts
    }
}

impl Derived for Extract {
    fn parent(&self) -> Provenance {
        self.parent
    }
}
