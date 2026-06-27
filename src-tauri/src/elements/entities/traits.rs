use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;

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

/// Elements with a typed parent.
pub trait Derived {
    fn parent(&self) -> ElementId;
}
