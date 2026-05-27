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

    pub fn new_unchecked(
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
    Document(DocumentContent),
    Assistant(String),
    ToolCall(ToolCallContent),
    ToolCallDisplay(ToolCallDisplayContent),
    ToolResult(ToolResultContent),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentContent {
    pub file_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallContent {
    pub(in crate::ai_integration) id: String,
    pub(in crate::ai_integration) name: String,
    pub(in crate::ai_integration) arguments: Value,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallDisplayContent {
    pub(in crate::ai_integration) id: String,
    pub(in crate::ai_integration) name: String,
    pub(in crate::ai_integration) arguments: Value,
    pub(in crate::ai_integration) display_name: String,
    pub(in crate::ai_integration) display_description_markdown: String,
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolResultContent {
    pub(in crate::ai_integration) id: String,
    pub(in crate::ai_integration) text: String,
}

impl From<rig::message::ToolCall> for ToolCallContent {
    fn from(tool_call: rig::message::ToolCall) -> Self {
        Self {
            id: tool_call.id,
            name: tool_call.function.name,
            arguments: tool_call.function.arguments,
        }
    }
}

impl From<rig::message::ToolResult> for ToolResultContent {
    fn from(tool_result: rig::message::ToolResult) -> Self {
        let text = tool_result
            .content
            .into_iter()
            .find_map(|c| {
                if let rig::message::ToolResultContent::Text(t) = c {
                    Some(t.text)
                } else {
                    None
                }
            })
            .unwrap_or_else(|| "Tool called successfully".to_string());

        Self {
            id: tool_result.id,
            text,
        }
    }
}

#[derive(Debug)]
pub struct UnsupportedMessageContent;

impl TryFrom<Message> for rig::message::Message {
    type Error = UnsupportedMessageContent;

    fn try_from(value: Message) -> Result<Self, Self::Error> {
        match value.content {
            MessageContent::Human(content) => Ok(rig::message::Message::User {
                content: OneOrMany::one(UserContent::text(content)),
            }),
            MessageContent::Document(DocumentContent { file_name }) => {
                Ok(rig::message::Message::User {
                    content: OneOrMany::one(UserContent::text(format!(
                        "I have uploaded the following file: {file_name}"
                    ))),
                })
            }
            MessageContent::Assistant(content) => Ok(rig::message::Message::Assistant {
                id: None,
                content: OneOrMany::one(AssistantContent::Text(Text { text: content })),
            }),
            MessageContent::ToolCall(ToolCallContent {
                id,
                name,
                arguments,
            }) => Ok(rig::message::Message::Assistant {
                id: None,
                content: OneOrMany::one(AssistantContent::ToolCall(rig::message::ToolCall {
                    id,
                    call_id: None,
                    function: rig::message::ToolFunction { name, arguments },
                    signature: None,
                    additional_params: None,
                })),
            }),
            MessageContent::ToolCallDisplay(_) => Err(UnsupportedMessageContent),
            MessageContent::ToolResult(ToolResultContent { id, text }) => {
                Ok(rig::message::Message::User {
                    content: OneOrMany::one(UserContent::ToolResult(rig::message::ToolResult {
                        id,
                        call_id: None,
                        content: OneOrMany::one(rig::message::ToolResultContent::text(text)),
                    })),
                })
            }
        }
    }
}
