use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Extract {
    pub meta: Meta,
    pub text: String,
}

impl Element for Extract {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
