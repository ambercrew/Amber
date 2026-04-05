pub mod dto;
pub mod settings_api;

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::{
    fs::{self, File},
    io::AsyncReadExt,
};

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SettingsDirectory(PathBuf);

impl SettingsDirectory {
    pub fn new(path_buf: PathBuf) -> Self {
        Self(path_buf)
    }

    pub fn get_path(&self) -> &PathBuf {
        &self.0
    }
}

impl AsRef<PathBuf> for SettingsDirectory {
    fn as_ref(&self) -> &PathBuf {
        &self.0
    }
}

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub directory: SettingsDirectory,
    pub database_location: String,
    pub theme: Theme,
    pub zoom_percentage: f64,
    pub auto_sync: bool,

    pub enable_ai: bool,
    pub ollama_model_name: Option<String>,
    pub ollama_embeddings_model_name: Option<String>,
}

#[derive(Debug, Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Theme {
    #[default]
    FollowSystem,
    Light,
    Dark,
}

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SettingsError {
    #[error("Error when trying to open the settings file!")]
    ErrorOpeningFile(String),
    #[error("Error when trying to read the settings file!")]
    ErrorReadingFile(String),
    #[error("Error when parsing the settings file!")]
    ParsingError(String),
    #[error("Error when saving the settings file!")]
    SavingError(String),
}

#[cfg(not(debug_assertions))]
const SETTINGS_FILE_NAME: &str = "settings.json";
#[cfg(debug_assertions)]
const SETTINGS_FILE_NAME: &str = "settings.dev.json";

const DEFAULT_DATABASE_FILE_NAME: &str = "brainy.db";

impl Settings {
    /// Initializes the settings if not found and then return it, the settings
    /// is automatically saved into a file if not found.
    pub async fn init_settings_and_get(
        settings_directory: SettingsDirectory,
    ) -> Result<Self, SettingsError> {
        if settings_directory
            .get_path()
            .join(SETTINGS_FILE_NAME)
            .exists()
        {
            Settings::read_settings_from_file(&settings_directory).await
        } else {
            let settings = Settings {
                database_location: settings_directory
                    .get_path()
                    .join(DEFAULT_DATABASE_FILE_NAME)
                    .to_str()
                    .unwrap()
                    .into(),
                directory: settings_directory,
                theme: Theme::FollowSystem,
                zoom_percentage: 100f64,
                auto_sync: true,
                enable_ai: true,
                ollama_model_name: None,
                ollama_embeddings_model_name: None,
            };
            settings.save_to_disk().await?;
            Ok(settings)
        }
    }

    async fn read_settings_from_file(
        settings_directory: &SettingsDirectory,
    ) -> Result<Self, SettingsError> {
        let settings_path = settings_directory.get_path().join(SETTINGS_FILE_NAME);
        log::info!("Reading settings from '{SETTINGS_FILE_NAME}'.");
        let mut file = match File::open(settings_path).await {
            Err(err) => return Err(SettingsError::ErrorOpeningFile(err.to_string())),
            Ok(file) => file,
        };
        let mut file_content = String::new();
        if let Err(err) = file.read_to_string(&mut file_content).await {
            return Err(SettingsError::ErrorReadingFile(err.to_string()));
        }
        match serde_json::from_str(&file_content) {
            Ok(settings) => Ok(settings),
            Err(err) => Err(SettingsError::ParsingError(err.to_string())),
        }
    }

    pub async fn save_to_disk(&self) -> Result<(), SettingsError> {
        let path = self.directory.get_path().join(SETTINGS_FILE_NAME);
        log::info!("Saving settings into '{}'.", path.to_str().unwrap());
        match fs::write(path, serde_json::to_string(self).unwrap()).await {
            Ok(_) => Ok(()),
            Err(err) => Err(SettingsError::SavingError(err.to_string())),
        }
    }
}

#[cfg(test)]
pub mod tests {
    use crate::test_utils::create_temp_directory;

    use super::*;

    #[tokio::test]
    pub async fn init_settings_and_get_new_settings_created_and_saved_to_disk() {
        // Arrange

        let directory = SettingsDirectory::new(create_temp_directory().await);

        // Act

        Settings::init_settings_and_get(directory.clone())
            .await
            .unwrap();

        // Assert

        assert!(directory.get_path().join(SETTINGS_FILE_NAME).exists());

        let mut file_content = String::new();
        File::open(directory.get_path().join(SETTINGS_FILE_NAME))
            .await
            .unwrap()
            .read_to_string(&mut file_content)
            .await
            .unwrap();

        let settings = serde_json::from_str::<Settings>(&file_content).unwrap();
        assert_eq!(settings.directory, directory);
        assert_eq!(
            settings.database_location,
            directory.get_path().join(DEFAULT_DATABASE_FILE_NAME)
        );
        assert_eq!(settings.theme, Theme::FollowSystem);
        assert_eq!(settings.zoom_percentage, 100f64);
        assert!(settings.auto_sync);
    }

    #[tokio::test]
    pub async fn init_settings_and_get_existing_setting_read_from_disk() {
        // Arrange

        let directory = SettingsDirectory::new(create_temp_directory().await);
        let mut settings = Settings::init_settings_and_get(directory.clone())
            .await
            .unwrap();
        settings.zoom_percentage = 1f64;
        settings.save_to_disk().await.unwrap();

        // Act

        let actual = Settings::init_settings_and_get(directory.clone())
            .await
            .unwrap();

        // Assert

        assert_eq!(actual.zoom_percentage, 1f64);
    }
}
