use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Reading {
    pub meta: Meta,
    pub content: String,
}

impl Element for Reading {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
