use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};

use crate::Guid;

#[derive(Serialize, Deserialize, Eq, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncedEntity {
    pub user_id: Guid,
    pub entity_id: Guid,
    pub created_date: DateTime<Utc>,
    pub last_sync_date: DateTime<Utc>,
    pub entity_type: EntityType,
    pub data: String,
}

#[derive(Serialize_repr, Deserialize_repr, Eq, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
#[repr(u8)]
pub enum EntityType {
    // NOTE: do not change the number as they are synced to the server.
    Folder = 1,
    File = 2,
    Cell = 3,
    Repetition = 4,
    Review = 5,
    DeletedEntity = 6,
}
