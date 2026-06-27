use uuid::Uuid;

use super::traits::{Derived, Element, Tagged};
use crate::elements::value_objects::card_parent::CardParent;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Card {
    pub meta: Meta,
    pub parent: CardParent,
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

impl Derived for Card {
    fn parent(&self) -> ElementId {
        self.parent.into()
    }
}
