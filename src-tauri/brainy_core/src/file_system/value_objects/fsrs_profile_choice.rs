use serde::{Deserialize, Serialize};

use crate::Guid;

/// Represents which FSRS-profile is chosen in a given item, e.g. file or a folder.
#[derive(Copy, Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type", content = "content")]
pub enum FsrsProfileChoice {
    Inherit,
    Id(Guid),
}

impl From<FsrsProfileChoice> for Option<Guid> {
    fn from(value: FsrsProfileChoice) -> Self {
        if let FsrsProfileChoice::Id(id) = value {
            Some(id)
        } else {
            None
        }
    }
}

impl From<Option<String>> for FsrsProfileChoice {
    fn from(value: Option<String>) -> Self {
        match value {
            None => FsrsProfileChoice::Inherit,
            Some(id) => FsrsProfileChoice::Id(Guid::parse_str(&id).expect("Expected an id")),
        }
    }
}

impl From<Option<Guid>> for FsrsProfileChoice {
    fn from(value: Option<Guid>) -> Self {
        match value {
            None => FsrsProfileChoice::Inherit,
            Some(id) => FsrsProfileChoice::Id(id),
        }
    }
}
