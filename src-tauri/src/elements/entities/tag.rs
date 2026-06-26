use uuid::Uuid;

use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Tag {
    pub meta: Meta,
    pub parent_tag_ids: Vec<Uuid>,
}

impl Element for Tag {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
