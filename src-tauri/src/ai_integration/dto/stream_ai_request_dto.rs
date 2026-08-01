use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamAiRequestDto {
    pub prompt: String,
    pub chat_id: Option<Uuid>,
}
