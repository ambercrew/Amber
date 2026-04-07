use async_trait::async_trait;
use thiserror::Error;

use crate::settings::entities::settings::Settings;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SettingsRepositoryError {
    #[error("Error when trying to open the settings file!")]
    ErrorOpeningFile(String),
    #[error("Error when trying to read the settings file!")]
    ErrorReadingFile(String),
    #[error("Error when parsing the settings file!")]
    ParsingError(String),
    #[error("Error when saving the settings file!")]
    SavingError(String),
}

#[async_trait]
pub trait SettingsRepository: Send + Sync {
    async fn get_settings(&self) -> Settings;
    async fn save_settings(&self, settings: Settings) -> Result<(), SettingsRepositoryError>;
}
