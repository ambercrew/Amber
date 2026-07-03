use serde::Deserialize;
use uuid::Uuid;

use super::create_meta_dto::CreateMetaDto;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExtractDto {
    pub id: Uuid,
    pub meta: CreateMetaDto,
    pub content: String,
}
