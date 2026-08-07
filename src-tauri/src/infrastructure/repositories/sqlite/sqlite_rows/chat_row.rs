use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::ai_integration::entities::chat::Chat;

pub struct ChatRow {
    pub id: Uuid,
    pub title: String,
    pub created_date: DateTime<Utc>,
}

impl From<ChatRow> for Chat {
    fn from(value: ChatRow) -> Self {
        Chat::new_unchecked(value.id, value.created_date, value.title)
    }
}
