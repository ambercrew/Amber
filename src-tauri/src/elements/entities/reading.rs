use super::traits::Element;
use crate::elements::value_objects::meta::Meta;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Reading {
    pub meta: Meta,
    pub source: ReadingSource,
    pub body: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum ReadingSource {
    Website { url: String },
    Clipboard,
    Pdf,
}

impl Element for Reading {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
