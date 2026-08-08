use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Card {
    pub meta: Meta,
    pub front: String,
    pub back: String,
}

impl Element for Card {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
