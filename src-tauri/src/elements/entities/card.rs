use uuid::Uuid;

use super::traits::{Element, Tagged};
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Card {
    pub meta: Meta,
    pub tags: Vec<Uuid>,
    pub front: String,
    pub back: String,
}

impl Element for Card {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}

impl Tagged for Card {
    fn tags(&self) -> &[Uuid] {
        &self.tags
    }
}
