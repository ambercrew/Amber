use uuid::Uuid;

use super::traits::Element;
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::read_point::ReadPoint;

/// A single chunk of a learning asset's content. Large learning assets are broken into splits so
/// that each can be reviewed independently; a non-split learning asset is just a single
/// split with `seq = 0`.
#[derive(Debug, Clone, PartialEq)]
pub struct LearningAssetSplit {
    pub seq: u32,
    pub content: String,
}

/// Identifies a single split within a learning asset.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LearningAssetSplitId {
    pub learning_asset_id: Uuid,
    pub seq: u32,
}

/// Lightweight description of a split, without its content. Used to lay out the
/// learning asset view without loading every split into memory: `char_count` drives the
/// height estimate for splits that haven't been mounted yet.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LearningAssetSplitMeta {
    pub seq: u32,
    pub char_count: u32,
}

/// Plain-text content of a split, without its Lexical JSON. Used to search splits
/// that haven't been mounted (and so have no live editor to search within).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LearningAssetSplitText {
    pub seq: u32,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LearningAsset {
    pub meta: Meta,
    /// Where the user last read up to. Device-independent.
    pub read_point: ReadPoint,
    /// Interval multiplier applied each time this learning asset is revisited. Seeded from
    /// the effective study profile's `initial_interval_multiplier` at creation time and kept
    /// fixed afterwards, independent of later profile edits.
    pub interval_multiplier: f32,
}

impl Element for LearningAsset {
    fn meta(&self) -> &Meta {
        &self.meta
    }
}
