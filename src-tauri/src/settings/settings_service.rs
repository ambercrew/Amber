use std::sync::Arc;

use injector_derive::ScopeInjectable;
use thiserror::Error;

use crate::settings::{
    dto::update_settings_request::UpdateSettingsRequest,
    repositories::traits::settings_repository::{SettingsRepository, SettingsRepositoryError},
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SettingsServiceError {
    #[error("{0}")]
    SettingsRepositoryError(#[from] SettingsRepositoryError),
}

#[derive(ScopeInjectable)]
pub struct SettingsService {
    settings_repository: Arc<dyn SettingsRepository>,
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
            // TODO: update frontend to refresh
            // TODO: should be something else, not coupled to sqlite database
            // TODO:
            // let new_pool =
            //     create_sqlite_pool(&format!("sqlite:///{}", settings.database_location)).await?;
            //
            // let pool = scope.resolve::<DbPool>().await;
            // let mut pool = pool.lock().await;
            //
            // *pool = new_pool.into_inner();
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
