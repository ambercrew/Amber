use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Folder {
    pub meta: Meta,
}

impl Element for Folder {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
