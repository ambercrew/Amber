use chrono::{DateTime, Utc};
use rig::{
    OneOrMany,
    agent::Text,
    message::{AssistantContent, UserContent},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::Guid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Message {
    id: Guid,
    created_date: DateTime<Utc>,
    chat_id: Guid,
    content: MessageContent,
}

impl Message {
    pub fn new(id: Option<Guid>, chat_id: Guid, content: MessageContent) -> Self {
        Self {
            id: id.unwrap_or(Guid::new_v4()),
            created_date: Utc::now(),
            chat_id,
            content,
        }
    }

    /// Used for unit testing, or repositories when reconstructing a message.
    pub(in crate::ai_integration) fn new_unchecked(
        id: Guid,
        created_date: DateTime<Utc>,
        chat_id: Guid,
        content: MessageContent,
    ) -> Self {
        Self {
            id,
            chat_id,
            created_date,
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

    pub fn content(&self) -> &MessageContent {
        &self.content
    }

    pub fn content_mut(&mut self) -> &mut MessageContent {
        &mut self.content
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "type", content = "value")]
pub enum MessageContent {
    Human(String),
    Document(Document),
    Assistant(String),
    ToolCall(ToolCall),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub file_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCall {
    pub(in crate::ai_integration) id: String,
    pub(in crate::ai_integration) name: String,
    pub(in crate::ai_integration) display_name: String,
    pub(in crate::ai_integration) display_description_markdown: String,
    pub(in crate::ai_integration) arguments: Value,
    pub(in crate::ai_integration) status: ToolCallStatus,
    pub(in crate::ai_integration) file_id: Option<Guid>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ToolCallStatus {
    Accepted,
    Rejected,
    Pending,
    AutomaticallyAccepted,
}

impl From<Message> for rig::message::Message {
    fn from(value: Message) -> Self {
        match value.content {
            MessageContent::Human(content) => rig::message::Message::User {
                content: OneOrMany::one(UserContent::text(content)),
            },
            MessageContent::Document(Document { file_name }) => rig::message::Message::User {
                content: OneOrMany::one(UserContent::text(format!(
                    "I have uploaded the following file: {file_name}"
                ))),
            },
            MessageContent::Assistant(content) => rig::message::Message::Assistant {
                id: None,
                content: OneOrMany::one(AssistantContent::Text(Text { text: content })),
            },
            MessageContent::ToolCall(ToolCall {
                id,
                name,
                arguments,
                ..
            }) => rig::message::Message::Assistant {
                id: None,
                content: OneOrMany::one(AssistantContent::ToolCall(rig::message::ToolCall {
                    id,
                    call_id: None,
                    function: rig::message::ToolFunction { name, arguments },
                    signature: None,
                    additional_params: None,
                })),
            },
        }
    }
}
