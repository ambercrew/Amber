use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::Guid;

#[derive(Serialize, Deserialize, Eq, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
/// Used to represent an entity that has been deleted, useful for sync.
pub struct DeletedEntity {
    pub entity_id: Guid,
    pub entity_name: String,
    pub entity_created_date: DateTime<Utc>,
    pub deleted_date: DateTime<Utc>,
}

impl DeletedEntity {
    pub fn new(
        entity_id: Guid,
        entity_name: String,
        entity_created_date: DateTime<Utc>,
        deleted_date: DateTime<Utc>,
    ) -> Self {
        Self {
            entity_id,
            entity_name,
            entity_created_date,
            deleted_date,
        }
    }
}
