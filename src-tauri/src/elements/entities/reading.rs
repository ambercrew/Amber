use uuid::Uuid;

use super::traits::Element;
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::reading_position::ReadingPosition;

/// A single chunk of a reading's content. Large readings are broken into splits so
/// that each can be reviewed independently; a non-split reading is just a single
/// split with `seq = 0`.
#[derive(Debug, Clone, PartialEq)]
pub struct ReadingSplit {
    pub seq: u32,
    pub content: String,
}

/// Identifies a single split within a reading.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReadingSplitId {
    pub reading_id: Uuid,
    pub seq: u32,
}

/// Lightweight description of a split, without its content. Used to lay out the
/// reading view without loading every split into memory: `char_count` drives the
/// height estimate for splits that haven't been mounted yet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReadingSplitMeta {
    pub seq: u32,
    pub char_count: u32,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Reading {
    pub meta: Meta,
    /// Where the user last read up to. Device-independent.
    pub position: ReadingPosition,
    /// Interval multiplier applied each time this reading is revisited. Seeded from
    /// the effective study profile's `initial_a_factor` at creation time and kept
    /// fixed afterwards, independent of later profile edits.
    pub a_factor: f32,
}

impl Element for Reading {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
