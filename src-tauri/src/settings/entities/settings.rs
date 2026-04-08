use serde::{Deserialize, Serialize};

use crate::settings::value_objects::{database_location::DatabaseLocation, theme::Theme};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub(in crate::settings) database_location: DatabaseLocation,
    pub theme: Theme,
    pub zoom_percentage: f64,
    pub auto_sync: bool,

    pub enable_ai: bool,
    pub ollama_model_name: Option<String>,
    pub ollama_embeddings_model_name: Option<String>,
}

impl Settings {
    pub fn new(database_location: DatabaseLocation) -> Self {
        Settings {
            database_location,
            theme: Theme::FollowSystem,
            zoom_percentage: 100f64,
            auto_sync: true,
            enable_ai: true,
            ollama_model_name: None,
            ollama_embeddings_model_name: None,
        }
    }

    pub fn database_location(&self) -> &DatabaseLocation {
        &self.database_location
    }
}
