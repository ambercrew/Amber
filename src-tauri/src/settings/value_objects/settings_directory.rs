use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SettingsDirectory(PathBuf);

// TODO: rename to app data directory
impl SettingsDirectory {
    pub fn new(path_buf: PathBuf) -> Self {
        Self(path_buf)
    }

    pub fn get_path(&self) -> &PathBuf {
        &self.0
    }
}

impl AsRef<PathBuf> for SettingsDirectory {
    fn as_ref(&self) -> &PathBuf {
        &self.0
    }
}
