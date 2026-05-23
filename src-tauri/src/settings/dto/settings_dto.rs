use serde::{Deserialize, Serialize};

use crate::settings::value_objects::{
    ai_provider::AiProvider, ai_provider_settings::AiProviderSettings, theme::Theme,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsDto {
    pub base_database_directory: String,

    pub theme: Theme,
    pub zoom_percentage: f64,
    pub auto_sync: bool,

    pub enable_ai: bool,
    pub ai_provider: AiProvider,
    pub ollama: AiProviderSettings,
    pub openai: AiProviderSettings,
    pub openai_api_key_is_set: bool,
}
