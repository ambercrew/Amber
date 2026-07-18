use serde::Deserialize;

use super::reading_split_id_dto::ReadingSplitIdDto;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateReadingDto {
    pub split_id: ReadingSplitIdDto,
    pub content: String,
}
