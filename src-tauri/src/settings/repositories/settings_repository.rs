use async_trait::async_trait;
use thiserror::Error;

use crate::SourceError;
use crate::settings::entities::settings::Settings;

#[derive(Error, Debug)]
pub enum SettingsRepositoryError {
    #[error("Failed to open the settings file!")]
    ErrorOpeningFile(#[source] SourceError),
    #[error("Failed to read the settings file!")]
    ErrorReadingFile(#[source] SourceError),
    #[error("Failed to parse the settings file!")]
    Parsing(#[source] SourceError),
    #[error("Failed to save the settings file!")]
    Saving(#[source] SourceError),
}

impl PartialEq for SettingsRepositoryError {
    fn eq(&self, other: &Self) -> bool {
        std::mem::discriminant(self) == std::mem::discriminant(other)
    }
}

impl Eq for SettingsRepositoryError {}

#[async_trait]
pub trait SettingsRepository: Send + Sync {
    async fn get_settings(&self) -> Settings;
    async fn save_settings(&self, settings: Settings) -> Result<(), SettingsRepositoryError>;
}
