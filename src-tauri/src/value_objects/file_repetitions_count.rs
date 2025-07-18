use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRepetitionCounts {
    pub new: i32,
    pub learning: i32,
    pub relearning: i32,
    pub review: i32,
}
