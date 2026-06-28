use uuid::Uuid;

use super::traits::{Element, Tagged};
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Extract {
    pub meta: Meta,
    pub tags: Vec<Uuid>,
    pub text: String,
}

impl Element for Extract {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}

impl Tagged for Extract {
    fn tags(&self) -> &[Uuid] {
        &self.tags
    }
}
