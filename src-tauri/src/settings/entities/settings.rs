use serde::{Deserialize, Serialize};

use crate::settings::value_objects::{database_location::DatabaseLocation, theme::Theme};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    // TODO: update front-end types
    pub database_location: DatabaseLocation,
    pub theme: Theme,
    pub zoom_percentage: f64,
    pub auto_sync: bool,

    pub enable_ai: bool,
    pub ollama_model_name: Option<String>,
    pub ollama_embeddings_model_name: Option<String>,
}
