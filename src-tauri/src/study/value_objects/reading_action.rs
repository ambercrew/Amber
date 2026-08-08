#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReadingAction {
    Next,
    Finish,
}

impl ReadingAction {
    pub fn as_str(&self) -> &'static str {
        match self {
            ReadingAction::Next => "next",
            ReadingAction::Finish => "finish",
        }
    }
}

impl From<&str> for ReadingAction {
    fn from(value: &str) -> Self {
        match value {
            "finish" => ReadingAction::Finish,
            _ => ReadingAction::Next,
        }
    }
}
