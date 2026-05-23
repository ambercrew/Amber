use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::settings::value_objects::{
    ai_provider::AiProvider, ai_provider_settings::AiProviderSettings,
    database_location::DatabaseLocation, settings_profile::SettingsProfile, theme::Theme,
};

#[cfg(not(debug_assertions))]
const DATABASE_FILE_NAME: &str = "brainy.db";
#[cfg(debug_assertions)]
const DATABASE_FILE_NAME: &str = "brainy.dev.db";

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub(in crate::settings) base_database_directory: PathBuf,
    pub(in crate::settings) profile: SettingsProfile,

    pub theme: Theme,
    pub zoom_percentage: f64,
    pub auto_sync: bool,

    pub enable_ai: bool,
    #[serde(default)]
    pub ai_provider: AiProvider,

    #[serde(default)]
    pub ollama: AiProviderSettings,
    #[serde(default)]
    pub openai: AiProviderSettings,
}

impl Settings {
    pub fn new(base_database_location: PathBuf, profile: SettingsProfile) -> Self {
        Settings {
            base_database_directory: base_database_location,
            profile,
            theme: Theme::FollowSystem,
            zoom_percentage: 100f64,
            auto_sync: true,
            enable_ai: true,
            ai_provider: AiProvider::default(),
            ollama: AiProviderSettings::default(),
            openai: AiProviderSettings::default(),
        }
    }

    /// The directory that contains the database file.
    pub fn database_directory(&self) -> PathBuf {
        match &self.profile {
            SettingsProfile::Default => self.base_database_directory.clone(),
            SettingsProfile::User(user) => self.base_database_directory.join(user),
        }
    }

    /// The full path to where the database is.
    pub fn database_location(&self) -> DatabaseLocation {
        DatabaseLocation(self.database_directory().join(DATABASE_FILE_NAME))
    }

    pub fn base_database_directory_as_string(&self) -> String {
        self.base_database_directory.to_string_lossy().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    pub fn database_directory_default_profile_returned_base_directory() {
        // Arrange

        let base = PathBuf::from("/data/brainy");
        let settings = Settings::new(base.clone(), SettingsProfile::Default);

        // Act

        let actual = settings.database_directory();

        // Assert

        assert_eq!(base, actual);
    }

    #[test]
    pub fn database_directory_user_profile_returned_correct_directory() {
        // Arrange

        let base = PathBuf::from("/data/brainy");
        let settings = Settings::new(base.clone(), SettingsProfile::User("user1".into()));

        // Act

        let actual = settings.database_directory();

        // Assert

        assert_eq!(base.join("user1"), actual);
    }
}
