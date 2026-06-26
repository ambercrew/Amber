use super::meta::Meta;
use crate::elements::entities::card::Card;
use crate::elements::entities::concept::Concept;
use crate::elements::entities::extract::Extract;
use crate::elements::entities::reading::Reading;
use crate::elements::entities::traits::{Categorized, Derived, Element};

/// A closed-set wrapper for storing elements together and matching exhaustively.
/// Implements `Element` so common accessors work without unwrapping, and offers
/// views down to the narrower traits.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AnyElement {
    Concept(Concept),
    Reading(Reading),
    Extract(Extract),
    Card(Card),
}

impl Element for AnyElement {
    fn meta(&self) -> &Meta {
        match self {
            AnyElement::Concept(e) => e.meta(),
            AnyElement::Reading(e) => e.meta(),
            AnyElement::Extract(e) => e.meta(),
            AnyElement::Card(e) => e.meta(),
        }
    }
}

impl AnyElement {
    pub fn as_categorized(&self) -> Option<&dyn Categorized> {
        match self {
            AnyElement::Reading(e) => Some(e),
            AnyElement::Extract(e) => Some(e),
            AnyElement::Card(e) => Some(e),
            AnyElement::Concept(_) => None,
        }
    }

    pub fn as_derived(&self) -> Option<&dyn Derived> {
        match self {
            AnyElement::Extract(e) => Some(e),
            AnyElement::Card(e) => Some(e),
            _ => None,
        }
    }
}
