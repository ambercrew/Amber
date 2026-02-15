use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::Guid;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct Chat {
    id: Guid,
    created_date: DateTime<Utc>,
    title: String,
}

impl Chat {
    pub fn new(id: Option<Guid>, title: String) -> Self {
        Self {
            id: id.unwrap_or(Guid::new_v4()),
            title,
            created_date: Utc::now(),
        }
    }

    /// Used for unit testing, or repositories when reconstructing a chat.
    pub fn new_unchecked(id: Guid, created_date: DateTime<Utc>, title: String) -> Self {
        Self {
            id,
            title,
            created_date,
        }
    }

    pub fn id(&self) -> Guid {
        self.id
    }

    pub fn title(&self) -> &str {
        &self.title
    }

    pub fn created_date(&self) -> DateTime<Utc> {
        self.created_date
    }
}
