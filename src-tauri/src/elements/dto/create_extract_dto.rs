use serde::Deserialize;

use super::create_meta_dto::CreateMetaDto;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExtractDto {
    pub meta: CreateMetaDto,
    pub text: String,
}
