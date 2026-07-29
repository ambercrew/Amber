use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum BibliographicalSourceType {
    File,
    WebPage,
}

impl BibliographicalSourceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            BibliographicalSourceType::File => "file",
            BibliographicalSourceType::WebPage => "web_page",
        }
    }
}

impl From<String> for BibliographicalSourceType {
    fn from(value: String) -> Self {
        match value.as_str() {
            "web_page" => BibliographicalSourceType::WebPage,
            _ => BibliographicalSourceType::File,
        }
    }
}
