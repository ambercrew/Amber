use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CardState {
    New,
    Learning,
    Review,
    Relearning,
}

impl CardState {
    pub fn as_str(&self) -> &'static str {
        match self {
            CardState::New => "new",
            CardState::Learning => "learning",
            CardState::Review => "review",
            CardState::Relearning => "relearning",
        }
    }
}

impl From<&str> for CardState {
    fn from(value: &str) -> Self {
        match value {
            "learning" => CardState::Learning,
            "review" => CardState::Review,
            "relearning" => CardState::Relearning,
            _ => CardState::New,
        }
    }
}
