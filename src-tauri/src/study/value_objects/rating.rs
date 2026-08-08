use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Rating {
    Again,
    Hard,
    Good,
    Easy,
}

impl Rating {
    pub fn as_str(&self) -> &'static str {
        match self {
            Rating::Again => "again",
            Rating::Hard => "hard",
            Rating::Good => "good",
            Rating::Easy => "easy",
        }
    }
}

impl From<&str> for Rating {
    fn from(value: &str) -> Self {
        match value {
            "hard" => Rating::Hard,
            "good" => Rating::Good,
            "easy" => Rating::Easy,
            _ => Rating::Again,
        }
    }
}
