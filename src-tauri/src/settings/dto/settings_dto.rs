use serde::{Deserialize, Serialize};

use crate::settings::value_objects::theme::Theme;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsDto {
    pub base_database_directory: String,

    pub theme: Theme,
    pub zoom_percentage: f64,
    pub auto_sync: bool,
}
