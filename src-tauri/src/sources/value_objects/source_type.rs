use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SourceType {
    File,
    WebPage,
}

impl SourceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SourceType::File => "file",
            SourceType::WebPage => "web_page",
        }
    }
}

impl From<String> for SourceType {
    fn from(value: String) -> Self {
        match value.as_str() {
            "web_page" => SourceType::WebPage,
            _ => SourceType::File,
        }
    }
}
