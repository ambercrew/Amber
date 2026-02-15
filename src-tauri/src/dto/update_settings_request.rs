use brainy_core::settings::Theme;
use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsRequest {
    pub database_location: Option<String>,
    pub theme: Option<Theme>,
    pub zoom_percentage: Option<f64>,
    pub auto_sync: Option<bool>,

    pub enable_ai: Option<bool>,
    pub ollama_model_name: Option<Option<String>>,
}
