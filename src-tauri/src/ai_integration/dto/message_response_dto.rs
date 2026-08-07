use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::ai_integration::entities::message::{Message, MessageContent};

/// A `Message` combined with the context snippets it was sent with, fetched
/// separately since they live in their own table. Only assembled where the
/// caller actually needs snippets (displaying a chat) rather than on every
/// message fetch.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageResponseDto {
    id: Uuid,
    created_date: DateTime<Utc>,
    chat_id: Uuid,
    content: MessageContent,
    context_snippets: Vec<String>,
}

impl MessageResponseDto {
    pub fn new(message: Message, context_snippets: Vec<String>) -> Self {
        Self {
            id: message.id(),
            created_date: message.created_date(),
            chat_id: message.chat_id(),
            content: message.content().clone(),
            context_snippets,
        }
    }
}
