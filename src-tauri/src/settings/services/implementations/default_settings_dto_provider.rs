use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::settings::{
    dto::settings_dto::SettingsDto, repositories::settings_repository::SettingsRepository,
    services::settings_dto_provider::SettingsDtoProvider,
};

#[derive(ScopeInjectable)]
pub struct DefaultSettingsDtoProvider {
    settings_repository: Arc<dyn SettingsRepository>,
}

#[async_trait]
impl SettingsDtoProvider for DefaultSettingsDtoProvider {
    async fn get_settings_dto(&self) -> SettingsDto {
        let settings = self.settings_repository.get_settings().await;

        SettingsDto {
            base_database_directory: settings.base_database_directory_as_string(),
            theme: settings.theme,
            zoom_percentage: settings.zoom_percentage,
            auto_sync: settings.auto_sync,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;
    use std::str::FromStr;
    use std::sync::Arc;

    use injector::{injector::Injector, register_scope};
    use tokio::sync::Mutex;

    use crate::{
        infrastructure::repositories::disk::disk_settings_repository::DiskSettingsRepository,
        settings::{
            entities::settings::Settings, repositories::settings_repository::SettingsRepository,
            services::settings_dto_provider::SettingsDtoProvider,
            value_objects::settings_profile::SettingsProfile,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector(settings: Settings) -> Injector {
        let mut injector = create_test_injector().await;

        injector.register_singleton(Arc::new(Mutex::new(settings)));
        register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
        register_scope!(injector, DefaultSettingsDtoProvider);

        injector
    }

    #[tokio::test]
    pub async fn get_settings_dto_mapped_all_settings_fields_correctly() {
        // Arrange

        let base_dir = PathBuf::from_str("/data/brainy").unwrap();
        let settings = Settings::new(base_dir.clone(), SettingsProfile::Default);

        let injector = initialize_test_injector(settings).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultSettingsDtoProvider>().await;

        // Act

        let actual = service.get_settings_dto().await;

        // Assert

        assert_eq!("/data/brainy", actual.base_database_directory);
    }
}
