use serde::Deserialize;
use uuid::Uuid;

use super::create_meta_dto::CreateMetaDto;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReadingDto {
    pub id: Uuid,
    pub meta: CreateMetaDto,
    pub splits: Vec<String>,
}
