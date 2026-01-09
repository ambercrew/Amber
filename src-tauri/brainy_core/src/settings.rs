use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::{
    fs::{self, File},
    io::AsyncReadExt,
};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub settings_dir: PathBuf,
    pub database_location: String,
    pub theme: Theme,
    pub zoom_percentage: f64,
    pub auto_sync: bool,
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
    #[error("No config directory is found on your system!")]
    NoConfigDirectory,
    #[error("Brainy is not able to create settings directory on your system!")]
    CannotCreateSettingsDirectory(String),
}

#[cfg(not(debug_assertions))]
const SETTINGS_FILE_NAME: &str = "settings.json";
#[cfg(debug_assertions)]
const SETTINGS_FILE_NAME: &str = "settings.dev.json";

const DEFAULT_DATABASE_FILE_NAME: &str = "brainy.db";

// TODO: unit test
impl Settings {
    /// Initializes the settings if not found and then return it, the settings
    /// is automatically saved into a file if not found.
    pub async fn init_settings_and_get(settings_dir: PathBuf) -> Result<Self, SettingsError> {
        if settings_dir.join(SETTINGS_FILE_NAME).exists() {
            Settings::read_settings_from_file(settings_dir).await
        } else {
            let settings = Settings {
                settings_dir: settings_dir.clone(),
                database_location: settings_dir
                    .join(DEFAULT_DATABASE_FILE_NAME)
                    .to_str()
                    .unwrap()
                    .into(),
                theme: Theme::FollowSystem,
                zoom_percentage: 100f64,
                auto_sync: true,
            };
            settings.save_to_disk().await?;
            Ok(settings)
        }
    }

    async fn read_settings_from_file(settings_dir: PathBuf) -> Result<Self, SettingsError> {
        let settings_path = settings_dir.join(SETTINGS_FILE_NAME);
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
            Err(err) => Err(SettingsError::ErrorOpeningFile(err.to_string())),
        }
    }

    pub async fn save_to_disk(&self) -> Result<(), SettingsError> {
        let path = self.settings_dir.join(SETTINGS_FILE_NAME);
        log::info!("Saving settings into '{}'.", path.to_str().unwrap());
        match fs::write(path, serde_json::to_string(self).unwrap()).await {
            Ok(_) => Ok(()),
            Err(err) => Err(SettingsError::ErrorOpeningFile(err.to_string())),
        }
    }
}

pub async fn get_settings_dir() -> Result<PathBuf, SettingsError> {
    let dir_path = match dirs::config_dir() {
        Some(dir) => dir.join("Brainy"),
        None => return Err(SettingsError::NoConfigDirectory),
    };
    match fs::create_dir_all(dir_path.clone()).await {
        Ok(_) => Ok(dir_path),
        Err(err) => Err(SettingsError::CannotCreateSettingsDirectory(
            err.to_string(),
        )),
    }
}
