use uuid::Uuid;

use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::provenance::Provenance;

/// Operations common to every element: stable identity and lifecycle.
pub trait Element {
    fn meta(&self) -> &Meta;

    fn is_removed(&self) -> bool {
        self.meta().removed_at.is_some()
    }
}

/// Elements that carry concept assignments — everything except `Concept`.
pub trait Categorized {
    fn concepts(&self) -> &[Uuid];
}

/// Elements with a provenance parent.
pub trait Derived {
    fn parent(&self) -> Provenance;
}
