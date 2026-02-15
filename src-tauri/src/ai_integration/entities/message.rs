use chrono::{DateTime, Utc};
use rig::{
    OneOrMany,
    agent::Text,
    message::{AssistantContent, UserContent},
};
use serde::{Deserialize, Serialize};

use crate::Guid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    id: Guid,
    created_date: DateTime<Utc>,
    chat_id: Guid,
    role: MessageRole,
    content: Option<String>,
}

impl Message {
    pub fn new(
        id: Option<Guid>,
        chat_id: Guid,
        role: MessageRole,
        content: Option<String>,
    ) -> Self {
        Self {
            id: id.unwrap_or(Guid::new_v4()),
            created_date: Utc::now(),
            chat_id,
            role,
            content,
        }
    }

    /// Used for unit testing, or repositories when reconstructing a message.
    pub(in crate::ai_integration) fn new_unchecked(
        id: Guid,
        created_date: DateTime<Utc>,
        chat_id: Guid,
        role: MessageRole,
        content: Option<String>,
    ) -> Self {
        Self {
            id,
            chat_id,
            created_date,
            role,
            content,
        }
    }

    pub fn id(&self) -> Guid {
        self.id
    }

    pub fn created_date(&self) -> DateTime<Utc> {
        self.created_date
    }

    pub fn chat_id(&self) -> Guid {
        self.chat_id
    }

    pub fn role(&self) -> MessageRole {
        self.role
    }

    pub fn content(&self) -> Option<&String> {
        self.content.as_ref()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum MessageRole {
    Human,
    Assistant,
}

impl From<Message> for rig::message::Message {
    fn from(value: Message) -> Self {
        match value.role {
            MessageRole::Human => rig::message::Message::User {
                content: OneOrMany::one(UserContent::text(value.content.unwrap_or_default())),
            },
            MessageRole::Assistant => rig::message::Message::Assistant {
                id: None,
                content: OneOrMany::one(AssistantContent::Text(Text {
                    text: value.content.unwrap_or_default(),
                })),
            },
        }
    }
}
