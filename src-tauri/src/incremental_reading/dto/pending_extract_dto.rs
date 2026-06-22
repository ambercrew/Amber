use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingExtractDto {
    pub id: String,
    pub inner_html: String,
}
