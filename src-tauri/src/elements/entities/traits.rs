use crate::elements::value_objects::meta::Meta;

pub trait Element {
    fn meta(&self) -> &Meta;
}
