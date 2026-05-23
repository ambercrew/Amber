use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    ai_integration::services::implementations::default_ai_client_provider::OPENAI_API_KEY_SECRET,
    secrets::repositories::secrets_repository::SecretsRepository,
    settings::{
        dto::settings_dto::SettingsDto, repositories::settings_repository::SettingsRepository,
        services::settings_dto_provider::SettingsDtoProvider,
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultSettingsDtoProvider {
    settings_repository: Arc<dyn SettingsRepository>,
    secrets_repository: Arc<dyn SecretsRepository>,
}

#[async_trait]
impl SettingsDtoProvider for DefaultSettingsDtoProvider {
    async fn get_settings_dto(&self) -> SettingsDto {
        let settings = self.settings_repository.get_settings().await;
        let openai_api_key_is_set = self
            .secrets_repository
            .get_secret(OPENAI_API_KEY_SECRET)
            .await
            .is_some_and(|k| !k.is_empty());

        SettingsDto {
            base_database_directory: settings.base_database_directory_as_string(),
            theme: settings.theme,
            zoom_percentage: settings.zoom_percentage,
            auto_sync: settings.auto_sync,
            enable_ai: settings.enable_ai,
            ai_provider: settings.ai_provider,
            ollama: settings.ollama,
            openai: settings.openai,
            openai_api_key_is_set,
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
        ai_integration::services::implementations::default_ai_client_provider::OPENAI_API_KEY_SECRET,
        infrastructure::repositories::disk::disk_settings_repository::DiskSettingsRepository,
        secrets::repositories::secrets_repository::SecretsRepository,
        settings::{
            entities::settings::Settings,
            repositories::settings_repository::SettingsRepository,
            services::settings_dto_provider::SettingsDtoProvider,
            value_objects::{ai_provider::AiProvider, settings_profile::SettingsProfile},
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
        let mut settings = Settings::new(base_dir.clone(), SettingsProfile::Default);
        settings.enable_ai = true;
        settings.ai_provider = AiProvider::OpenAI;
        settings.ollama.model_name = Some("llama3".to_string());
        settings.ollama.embeddings_model_name = Some("nomic-embed-text".to_string());
        settings.openai.model_name = Some("gpt-4o".to_string());
        settings.openai.embeddings_model_name = Some("text-embedding-3-small".to_string());

        let injector = initialize_test_injector(settings).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultSettingsDtoProvider>().await;

        // Act

        let actual = service.get_settings_dto().await;

        // Assert

        assert_eq!("/data/brainy", actual.base_database_directory);
        assert!(actual.enable_ai);
        assert_eq!(AiProvider::OpenAI, actual.ai_provider);
        assert_eq!(Some("llama3".to_string()), actual.ollama.model_name);
        assert_eq!(
            Some("nomic-embed-text".to_string()),
            actual.ollama.embeddings_model_name
        );
        assert_eq!(Some("gpt-4o".to_string()), actual.openai.model_name);
        assert_eq!(
            Some("text-embedding-3-small".to_string()),
            actual.openai.embeddings_model_name
        );
    }

    #[tokio::test]
    pub async fn get_settings_dto_no_api_key_returned_openai_api_key_is_set_false() {
        // Arrange

        let injector = initialize_test_injector(Settings::default()).await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultSettingsDtoProvider>().await;

        // Act

        let actual = service.get_settings_dto().await;

        // Assert

        assert!(!actual.openai_api_key_is_set);
    }

    #[tokio::test]
    pub async fn get_settings_dto_api_key_set_returned_openai_api_key_is_set_true() {
        // Arrange

        let injector = initialize_test_injector(Settings::default()).await;
        let scope = injector.start_scope();
        let secrets_repository = scope.resolve::<dyn SecretsRepository>().await;
        secrets_repository
            .set_secret(OPENAI_API_KEY_SECRET, "sk-test-key")
            .await
            .unwrap();

        let service = scope.resolve::<DefaultSettingsDtoProvider>().await;

        // Act

        let actual = service.get_settings_dto().await;

        // Assert

        assert!(actual.openai_api_key_is_set);
    }
}
