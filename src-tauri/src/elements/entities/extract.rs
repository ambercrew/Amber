use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq)]
pub struct Extract {
    pub meta: Meta,
    pub content: String,
    /// Interval multiplier applied each time this extract is revisited. Seeded from
    /// the effective study profile's `initial_interval_multiplier` at creation time and kept
    /// fixed afterwards, independent of later profile edits.
    pub interval_multiplier: f32,
}

impl Element for Extract {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
