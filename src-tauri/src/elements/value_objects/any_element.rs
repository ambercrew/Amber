use super::meta::Meta;
use crate::elements::entities::card::Card;
use crate::elements::entities::extract::Extract;
use crate::elements::entities::folder::Folder;
use crate::elements::entities::reading::Reading;
use crate::elements::entities::tag::Tag;
use crate::elements::entities::traits::{Element, Tagged};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnyElement {
    Folder(Folder),
    Tag(Tag),
    Reading(Reading),
    Extract(Extract),
    Card(Card),
}

impl Element for AnyElement {
    fn meta(&self) -> &Meta {
        match self {
            AnyElement::Folder(e) => e.meta(),
            AnyElement::Tag(e) => e.meta(),
            AnyElement::Reading(e) => e.meta(),
            AnyElement::Extract(e) => e.meta(),
            AnyElement::Card(e) => e.meta(),
        }
    }
}

impl AnyElement {
    pub fn as_tagged(&self) -> Option<&dyn Tagged> {
        match self {
            AnyElement::Folder(e) => Some(e),
            AnyElement::Reading(e) => Some(e),
            AnyElement::Extract(e) => Some(e),
            AnyElement::Card(e) => Some(e),
            AnyElement::Tag(_) => None,
        }
    }
}
