use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum IncrementalReadingPriority {
    High,
    Normal,
    Low,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncrementalReadingSource {
    #[serde(rename = "type")]
    pub source_type: String,
    pub url: String,
}

#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncrementalReading {
    pub content: Option<String>,
    pub title: Option<String>,
    pub source: IncrementalReadingSource,
    pub priority: IncrementalReadingPriority,
    pub completed: bool,
    /// Top-level block index the user last read up to (device-independent).
    pub scroll_position: Option<u32>,
}
