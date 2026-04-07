use std::sync::Arc;

use injector_derive::ScopeInjectable;
use thiserror::Error;

use crate::{
    database::database_connection_manager::{
        DatabaseConnectionManager, DatabaseConnectionManagerError,
    },
    settings::{
        dto::update_settings_request::UpdateSettingsRequest,
        repositories::settings_repository::{SettingsRepository, SettingsRepositoryError},
    },
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SettingsServiceError {
    #[error("{0}")]
    SettingsRepositoryError(#[from] SettingsRepositoryError),
    #[error("{0}")]
    DatabaseConnectionManagerError(#[from] DatabaseConnectionManagerError),
}

#[derive(ScopeInjectable)]
pub struct SettingsService {
    settings_repository: Arc<dyn SettingsRepository>,
    database_connection_manager: Arc<dyn DatabaseConnectionManager>,
}

impl SettingsService {
    pub async fn update_settings(
        &self,
        new_settings: UpdateSettingsRequest,
    ) -> Result<(), SettingsServiceError> {
        let mut settings = self.settings_repository.get_settings().await;

        if let Some(database_location) = new_settings.database_location
            && settings.database_location != database_location
        {
            settings.database_location = database_location;
            // TODO: unit test
            self.database_connection_manager
                .change_database_location(&settings.database_location)
                .await?;
        }
        if let Some(theme) = new_settings.theme {
            settings.theme = theme;
        }
        if let Some(zoom_percentage) = new_settings.zoom_percentage {
            settings.zoom_percentage = zoom_percentage;
        }
        if let Some(auto_sync) = new_settings.auto_sync {
            settings.auto_sync = auto_sync;
        }
        if let Some(enable_ai) = new_settings.enable_ai {
            settings.enable_ai = enable_ai;
        }
        if let Some(ollama_model_name) = new_settings.ollama_model_name {
            settings.ollama_model_name = ollama_model_name;
        }
        if let Some(ollama_embeddings_model_name) = new_settings.ollama_embeddings_model_name {
            settings.ollama_embeddings_model_name = ollama_embeddings_model_name;
        }

        self.settings_repository.save_settings(settings).await?;

        Ok(())
    }
}
