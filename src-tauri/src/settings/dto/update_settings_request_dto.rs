use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::settings::value_objects::{settings_profile::SettingsProfile, theme::Theme};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsRequestDto {
    pub base_database_directory: Option<PathBuf>,
    pub profile: Option<SettingsProfile>,

    pub theme: Option<Theme>,
    pub zoom_percentage: Option<f64>,
    pub auto_sync: Option<bool>,
}
