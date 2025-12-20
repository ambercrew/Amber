use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{
    Guid,
    sync::entities::synced_entity::{EntityType, SyncedEntity},
};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProblemDetails {
    pub detail: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SignInDto {
    pub username: String,
    pub password: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UserInformationDto {
    pub id: Guid,
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SignUpDto {
    pub username: String,
    pub password: String,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserInformationDto {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SyncedEntitiesPageDto {
    pub synced_entities: Vec<SyncedEntity>,
    pub has_more: bool,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SyncEntityDto {
    pub entity_id: Guid,
    pub created_date: DateTime<Utc>,
    pub entity_type: EntityType,
    pub data: String,
}
