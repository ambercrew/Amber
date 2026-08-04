use uuid::Uuid;

use crate::ai_integration::entities::context_snippet::ContextSnippet;

pub struct ContextSnippetRow {
    pub id: Uuid,
    pub ai_message_id: Uuid,
    pub snippet: String,
    pub position: i64,
}

impl From<ContextSnippetRow> for ContextSnippet {
    fn from(value: ContextSnippetRow) -> Self {
        ContextSnippet::new_unchecked(value.id, value.ai_message_id, value.snippet, value.position)
    }
}
