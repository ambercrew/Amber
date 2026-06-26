use uuid::Uuid;

use super::traits::{Categorized, Element};
use crate::elements::value_objects::meta::Meta;

/// A piece of imported material. `body` is always HTML regardless of the
/// original format. `source` records provenance for reference.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Reading {
    pub meta: Meta,
    pub concepts: Vec<Uuid>,
    pub source: ReadingSource,
    /// The readable content, always HTML.
    pub body: String,
}

/// Origin of a Reading's content. The body is HTML regardless; this only tracks
/// provenance of the import.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReadingSource {
    Article {
        url: String,
    },
    Clipboard,
    /// Imported from a PDF. The original file is not referenced — filesystem
    /// paths aren't portable across machines.
    Pdf,
}

impl Element for Reading {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}

impl Categorized for Reading {
    fn concepts(&self) -> &[Uuid] {
        &self.concepts
    }
}
