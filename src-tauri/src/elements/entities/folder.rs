use uuid::Uuid;

use super::traits::{Element, Tagged};
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Folder {
    pub meta: Meta,
    pub parent_folder_id: Option<Uuid>,
    pub tags: Vec<Uuid>,
}

impl Element for Folder {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}

impl Tagged for Folder {
    fn tags(&self) -> &[Uuid] {
        &self.tags
    }
}
