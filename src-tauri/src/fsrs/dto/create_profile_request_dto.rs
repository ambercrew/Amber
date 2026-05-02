use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProfileRequestDto {
    pub name: String,
    pub request_retention: f64,
    pub maximum_interval: f64,
    pub weights: Vec<f64>,
}
