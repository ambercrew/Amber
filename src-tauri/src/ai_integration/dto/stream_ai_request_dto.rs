use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamAiRequestDto {
    pub prompt: String,
    pub chat_id: Option<Uuid>,
    /// The element that is used as the basis for AI generation, often
    /// the element that the user is currently viewing.
    pub element_id: Option<ElementId>,
    /// Text snippets added as extra context. Never used for
    /// chat-title generation.
    pub context_snippets: Vec<String>,
}
