use async_trait::async_trait;
use thiserror::Error;

use crate::{
    database::database_connection_manager::DatabaseConnectionManagerError,
    settings::{
        dto::update_settings_request_dto::UpdateSettingsRequestDto,
        repositories::settings_repository::SettingsRepositoryError,
    },
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum SettingsUpdaterError {
    #[error(transparent)]
    SettingsRepository(#[from] SettingsRepositoryError),
    #[error(transparent)]
    DatabaseConnectionManager(#[from] DatabaseConnectionManagerError),
}

#[async_trait]
pub trait SettingsUpdater: Send + Sync {
    async fn update_settings(
        &self,
        new_settings: UpdateSettingsRequestDto,
    ) -> Result<(), SettingsUpdaterError>;

    async fn set_profile_for_new_user(
        &self,
        profile_name: String,
    ) -> Result<(), SettingsUpdaterError>;
}
