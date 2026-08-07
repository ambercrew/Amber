#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LearningAssetAction {
    Next,
    Finish,
}

impl LearningAssetAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            LearningAssetAction::Next => "next",
            LearningAssetAction::Finish => "finish",
        }
    }
}

impl From<&str> for LearningAssetAction {
    fn from(value: &str) -> Self {
        match value {
            "finish" => LearningAssetAction::Finish,
            _ => LearningAssetAction::Next,
        }
    }
}
