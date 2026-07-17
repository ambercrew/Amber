use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq)]
pub struct Reading {
    pub meta: Meta,
    pub content: String,
    /// Top-level block index the user last read up to. Device-independent.
    pub position_block_index: u32,
    /// Interval multiplier applied each time this reading is revisited. Seeded from
    /// the effective study profile's `initial_a_factor` at creation time and kept
    /// fixed afterwards, independent of later profile edits.
    pub a_factor: f32,
}

impl Element for Reading {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
