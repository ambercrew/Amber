use uuid::Uuid;

use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::provenance::Provenance;

pub trait Element {
    fn meta(&self) -> &Meta;

    fn is_removed(&self) -> bool {
        self.meta().removed_at.is_some()
    }
}

/// Elements that carry direct tag assignments.
pub trait Tagged {
    fn tags(&self) -> &[Uuid];
}

/// Elements with a provenance parent (Reading, Extract, or Folder).
pub trait Derived {
    fn parent(&self) -> Provenance;
}
