use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_repr::{Deserialize_repr, Serialize_repr};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Eq, PartialEq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncedEntity {
    pub user_id: Uuid,
    pub entity_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub last_sync_date: DateTime<Utc>,
    pub entity_type: EntityType,
    pub data: String,
}

#[derive(Serialize_repr, Deserialize_repr, Eq, PartialEq, Debug, Clone, Copy)]
#[serde(rename_all = "camelCase")]
#[repr(u8)]
pub enum EntityType {
    // NOTE: do not change the number as they are synced to the server.
    DeletedEntity = 1,
}
