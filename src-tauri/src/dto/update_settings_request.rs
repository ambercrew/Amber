use serde::{Deserialize, Serialize};

use crate::value_objects::settings::Theme;

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsRequest {
    pub database_location: Option<String>,
    pub theme: Option<Theme>,
    pub zoom_percentage: Option<f32>,
}
