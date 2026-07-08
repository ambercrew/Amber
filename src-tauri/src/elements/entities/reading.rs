use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Reading {
    pub meta: Meta,
    pub content: String,
    /// Top-level block index the user last read up to. Device-independent.
    pub position_block_index: u32,
}

impl Element for Reading {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
