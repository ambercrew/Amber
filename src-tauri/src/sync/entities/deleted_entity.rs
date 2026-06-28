use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Eq, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
/// Used to represent an entity that has been deleted, useful for sync.
pub struct DeletedEntity {
    pub entity_id: Uuid,
    pub entity_name: String,
    pub entity_created_at: DateTime<Utc>,
    pub deleted_date: DateTime<Utc>,
}

impl DeletedEntity {
    pub fn new(
        entity_id: Uuid,
        entity_name: String,
        entity_created_at: DateTime<Utc>,
        deleted_date: DateTime<Utc>,
    ) -> Self {
        Self {
            entity_id,
            entity_name,
            entity_created_at,
            deleted_date,
        }
    }
}
