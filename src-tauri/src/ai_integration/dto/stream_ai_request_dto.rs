use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamAiRequestDto {
    pub prompt: String,
    pub chat_id: Option<Uuid>,
    /// The element the user is currently viewing, if any. Used to build
    /// context for the chat preamble (see `prompts::preamble`); never used
    /// for chat-title generation.
    pub element_id: Option<ElementId>,
    /// Text snippets added as extra context. Never used for
    /// chat-title generation.
    pub context_snippets: Vec<String>,
}
