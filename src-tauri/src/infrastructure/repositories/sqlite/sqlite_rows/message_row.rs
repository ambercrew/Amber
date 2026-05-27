use chrono::{DateTime, Utc};

use crate::{
    Guid,
    ai_integration::entities::message::{Message, MessageContent},
};

pub const HUMAN_CONTENT_TYPE: &str = "human";
pub const ASSISTANT_CONTENT_TYPE: &str = "assistant";
pub const TOOL_CALL_CONTENT_TYPE: &str = "tool_call";
pub const TOOL_CALL_DISPLAY_CONTENT_TYPE: &str = "tool_call_display";
pub const DOCUMENT_CONTENT_TYPE: &str = "document";
pub const TOOL_RESULT_TYPE: &str = "tool_result";

pub struct MessageRow {
    pub id: Guid,
    pub created_date: DateTime<Utc>,
    pub chat_id: Guid,
    pub content_type: String,
    pub content: Option<String>,
}

impl From<MessageRow> for Message {
    fn from(value: MessageRow) -> Self {
        let message_content = if value.content_type == HUMAN_CONTENT_TYPE {
            MessageContent::Human(value.content.unwrap())
        } else if value.content_type == ASSISTANT_CONTENT_TYPE {
            MessageContent::Assistant(value.content.unwrap())
        } else if value.content_type == TOOL_CALL_CONTENT_TYPE {
            MessageContent::ToolCall(serde_json::from_str(&value.content.unwrap()).unwrap())
        } else if value.content_type == TOOL_CALL_DISPLAY_CONTENT_TYPE {
            MessageContent::ToolCallDisplay(serde_json::from_str(&value.content.unwrap()).unwrap())
        } else if value.content_type == DOCUMENT_CONTENT_TYPE {
            MessageContent::Document(serde_json::from_str(&value.content.unwrap()).unwrap())
        } else {
            MessageContent::ToolResult(serde_json::from_str(&value.content.unwrap()).unwrap())
        };

        Message::new_unchecked(value.id, value.created_date, value.chat_id, message_content)
    }
}
