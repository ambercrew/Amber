use serde::Serialize;

pub const CONVERT_MARKDOWN_TO_LEXICAL_EVENT: &str = "convert-markdown-to-lexical";

#[derive(Serialize, Clone)]
pub struct ConvertMarkdownToLexicalPayload {
    pub markdown: String,
}
