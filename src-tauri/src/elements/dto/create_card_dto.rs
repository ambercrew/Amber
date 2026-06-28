use serde::Deserialize;

use super::create_meta_dto::CreateMetaDto;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCardDto {
    pub meta: CreateMetaDto,
    pub front: String,
    pub back: String,
}
