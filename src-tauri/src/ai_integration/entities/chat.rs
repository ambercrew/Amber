use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Chat {
    id: Uuid,
    created_date: DateTime<Utc>,
    title: String,
}

impl Chat {
    pub fn new(id: Option<Uuid>, title: String) -> Self {
        Self {
            id: id.unwrap_or(Uuid::new_v4()),
            title,
            created_date: Utc::now(),
        }
    }

    pub fn new_unchecked(id: Uuid, created_date: DateTime<Utc>, title: String) -> Self {
        Self {
            id,
            title,
            created_date,
        }
    }

    pub fn id(&self) -> Uuid {
        self.id
    }

    pub fn title(&self) -> &str {
        &self.title
    }

    pub fn created_date(&self) -> DateTime<Utc> {
        self.created_date
    }

    pub fn set_title(&mut self, title: String) {
        self.title = title;
    }
}
