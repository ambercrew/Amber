use async_trait::async_trait;

use crate::settings::dto::settings_dto::SettingsDto;

#[async_trait]
pub trait SettingsDtoProvider: Send + Sync {
    async fn get_settings_dto(&self) -> SettingsDto;
}
