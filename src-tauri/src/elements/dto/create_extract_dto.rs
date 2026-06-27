use serde::Deserialize;

use crate::elements::value_objects::extract_parent::ExtractParent;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExtractDto {
    pub name: String,
    pub position: i64,
    pub parent: ExtractParent,
    pub text: String,
}
