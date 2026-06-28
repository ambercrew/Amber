use uuid::Uuid;

use crate::elements::value_objects::meta::Meta;

pub trait Element {
    fn meta(&self) -> &Meta;
}

/// Elements that carry direct tag assignments.
pub trait Tagged {
    fn tags(&self) -> &[Uuid];
}
