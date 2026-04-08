use std::{path::PathBuf, sync::Arc};

use injector_derive::ScopeInjectable;
use thiserror::Error;

use crate::{
    database::database_connection_manager::{
        DatabaseConnectionManager, DatabaseConnectionManagerError,
    },
    settings::{
        dto::update_settings_request::UpdateSettingsRequest,
        entities::settings::Settings,
        repositories::settings_repository::{SettingsRepository, SettingsRepositoryError},
        value_objects::database_location::{
            DatabaseLocation, DatabaseLocationError, DatabaseLocationProfile,
        },
    },
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SettingsServiceError {
    #[error("{0}")]
    SettingsRepository(#[from] SettingsRepositoryError),
    #[error("{0}")]
    DatabaseConnectionManager(#[from] DatabaseConnectionManagerError),
    #[error("{0}")]
    DatabaseLocation(#[from] DatabaseLocationError),
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

        if let Some(new_base_dir) = new_settings.database_location_base_dir
            && new_base_dir != *settings.database_location.base_dir()
        {
            self.update_database_location(&mut settings, Some(new_base_dir), None)
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

    pub async fn set_database_location_profile(
        &self,
        profile: DatabaseLocationProfile,
    ) -> Result<(), SettingsServiceError> {
        let mut settings = self.settings_repository.get_settings().await;
        self.update_database_location(&mut settings, None, Some(profile))
            .await?;
        self.settings_repository.save_settings(settings).await?;
        Ok(())
    }

    async fn update_database_location(
        &self,
        settings: &mut Settings,
        new_base_dir: Option<PathBuf>,
        new_profile: Option<DatabaseLocationProfile>,
    ) -> Result<(), SettingsServiceError> {
        if new_base_dir.is_none() & new_profile.is_none() {
            return Ok(());
        }

        settings.database_location = DatabaseLocation::new(
            new_base_dir.unwrap_or(settings.database_location.base_dir().clone()),
            new_profile.unwrap_or(settings.database_location.profile().clone()),
        )?;

        self.database_connection_manager
            .change_database_location(&settings.database_location)
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

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
            database_location_base_dir: Some("/new path".into()),
            ..Default::default()
        };

        let mut database_connection_manager = MockDatabaseConnectionManager::new();
        database_connection_manager
            .expect_change_database_location()
            .with(eq(DatabaseLocation::new(
                PathBuf::from_str("/new path").unwrap(),
                DatabaseLocationProfile::Default,
            )
            .unwrap()))
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
            .expect_change_database_location()
            .never();

        let injector = initialize_test_injector(database_connection_manager).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<SettingsService>().await;

        // Act & Assert

        service.update_settings(request).await.unwrap();
    }
}
