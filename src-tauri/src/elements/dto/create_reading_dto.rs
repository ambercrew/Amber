use serde::Deserialize;

use crate::elements::entities::reading::ReadingSource;

use super::create_meta_dto::CreateMetaDto;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateReadingDto {
    pub meta: CreateMetaDto,
    pub source: ReadingSource,
    pub body: String,
}
