use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::settings::value_objects::{database_location::DatabaseLocation, theme::Theme};

const DATABASE_FILE_NAME: &str = "brainy.db";

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SettingsProfile {
    #[default]
    Default,
    User(String),
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    // TODO: update front-end types
    pub(in crate::settings) base_database_location: PathBuf,
    pub(in crate::settings) profile: SettingsProfile,

    pub theme: Theme,
    pub zoom_percentage: f64,
    pub auto_sync: bool,

    pub enable_ai: bool,
    pub ollama_model_name: Option<String>,
    pub ollama_embeddings_model_name: Option<String>,
}

impl Settings {
    pub fn new(base_database_location: PathBuf, profile: SettingsProfile) -> Self {
        Settings {
            base_database_location,
            profile,
            theme: Theme::FollowSystem,
            zoom_percentage: 100f64,
            auto_sync: true,
            enable_ai: true,
            ollama_model_name: None,
            ollama_embeddings_model_name: None,
        }
    }

    // TODO: unit testing
    /// The directory that contains the database file.
    pub fn database_directory(&self) -> PathBuf {
        match &self.profile {
            SettingsProfile::Default => self.base_database_location.clone(),
            SettingsProfile::User(user) => self.base_database_location.join(user),
        }
    }

    /// The full path to where the database is.
    pub fn get_database_location(&self) -> DatabaseLocation {
        DatabaseLocation(self.database_directory().join(DATABASE_FILE_NAME))
    }
}
