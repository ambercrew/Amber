use serde::Deserialize;

use super::create_meta_dto::CreateMetaDto;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReadingDto {
    pub meta: CreateMetaDto,
    pub body: String,
}
