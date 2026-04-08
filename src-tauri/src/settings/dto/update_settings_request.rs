use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::settings::value_objects::theme::Theme;

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsRequest {
    // TODO: update frond-end
    pub database_location_base_dir: Option<PathBuf>,
    pub theme: Option<Theme>,
    pub zoom_percentage: Option<f64>,
    pub auto_sync: Option<bool>,

    pub enable_ai: Option<bool>,
    pub ollama_model_name: Option<Option<String>>,
    pub ollama_embeddings_model_name: Option<Option<String>>,
}
