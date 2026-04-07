use rig::Embed;
use rig_sqlite::{Column, ColumnValue, SqliteVectorStoreTable};
use serde::{Deserialize, Serialize};

use crate::Guid;

pub const CHAT_ID_COLUMN_NAME: &str = "chat_id";

#[derive(Embed, Clone, Debug, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub chat_id: Guid,
    #[embed]
    pub content: String,
}

impl SqliteVectorStoreTable for Document {
    fn name() -> &'static str {
        "documents"
    }

    fn schema() -> Vec<Column> {
        vec![
            Column::new("id", "TEXT PRIMARY KEY"),
            Column::new(CHAT_ID_COLUMN_NAME, "TEXT NOT NULL"),
            Column::new("content", "TEXT"),
        ]
    }

    fn id(&self) -> String {
        self.id.clone()
    }

    fn column_values(&self) -> Vec<(&'static str, Box<dyn ColumnValue>)> {
        vec![
            ("id", Box::new(self.id.clone())),
            ("content", Box::new(self.content.clone())),
            (CHAT_ID_COLUMN_NAME, Box::new(self.chat_id.to_string())),
        ]
    }
}
