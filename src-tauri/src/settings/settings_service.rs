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
        value_objects::settings_profile::SettingsProfile,
    },
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SettingsServiceError {
    #[error(transparent)]
    SettingsRepository(#[from] SettingsRepositoryError),
    #[error(transparent)]
    DatabaseConnectionManager(#[from] DatabaseConnectionManagerError),
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
        let mut change_database_location = false;

        if let Some(new_base_dir) = new_settings.base_database_directory
            && new_base_dir != settings.base_database_directory
        {
            settings.base_database_directory = new_base_dir;
            change_database_location = true;
        }
        if let Some(new_profile) = new_settings.profile
            && new_profile != settings.profile
        {
            settings.profile = new_profile;
            change_database_location = true;
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

        if change_database_location {
            log::info!(
                "Changing database location to {}",
                settings.database_location()
            );
            self.database_connection_manager
                .connect_to_database(settings.database_location())
                .await?;
        }

        self.settings_repository.save_settings(settings).await?;

        Ok(())
    }

    /// Sets the profile for settings when the user is newly created, leading to
    /// database being moved to the new user location.
    pub async fn set_profile_for_new_user(
        &self,
        profile_name: String,
    ) -> Result<(), SettingsServiceError> {
        let mut settings = self.settings_repository.get_settings().await;
        settings.profile = SettingsProfile::User(profile_name);
        self.database_connection_manager
            .move_database_to(settings.database_location())
            .await?;
        self.settings_repository.save_settings(settings).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::{path::PathBuf, str::FromStr};

    use injector::{injector::Injector, register_scope};
    use mockall::predicate::eq;
    use tokio::sync::Mutex;

    use crate::{
        database::database_connection_manager::MockDatabaseConnectionManager,
        infrastructure::repositories::disk::disk_settings_repository::DiskSettingsRepository,
        settings::{
            entities::settings::Settings, value_objects::database_location::DatabaseLocation,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector(
        database_connection_manager: MockDatabaseConnectionManager,
    ) -> Injector {
        let mut injector = create_test_injector().await;

        let settings = Settings {
            ..Default::default()
        };

        injector.register_singleton(Arc::new(Mutex::new(settings)));
        injector.register_singleton::<dyn DatabaseConnectionManager>(Arc::new(
            database_connection_manager,
        ));

        register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
        register_scope!(injector, SettingsService);

        injector
    }

    #[tokio::test]
    pub async fn update_settings_updated_database_location_called_manager() {
        // Arrange

        let request = UpdateSettingsRequest {
            base_database_directory: Some("new path".into()),
            ..Default::default()
        };

        let mut database_connection_manager = MockDatabaseConnectionManager::new();
        database_connection_manager
            .expect_connect_to_database()
            .with(eq(DatabaseLocation::new_unchecked(
                PathBuf::from_str("new path").unwrap().join("brainy.db"),
            )))
            .returning(|_| Box::pin(async { Ok(()) }));

        let injector = initialize_test_injector(database_connection_manager).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<SettingsService>().await;

        // Act & Assert

        service.update_settings(request).await.unwrap();
    }

    #[tokio::test]
    pub async fn update_settings_did_not_update_database_location_did_not_call_manager() {
        // Arrange

        let request = UpdateSettingsRequest {
            ..Default::default()
        };

        let mut database_connection_manager = MockDatabaseConnectionManager::new();
        database_connection_manager
            .expect_connect_to_database()
            .never();

        let injector = initialize_test_injector(database_connection_manager).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<SettingsService>().await;

        // Act & Assert

        service.update_settings(request).await.unwrap();
    }
}
