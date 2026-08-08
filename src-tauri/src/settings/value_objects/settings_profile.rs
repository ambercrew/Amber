use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SettingsProfile {
    #[default]
    Default,
    User(String),
}
