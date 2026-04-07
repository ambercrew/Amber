use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AppDataDirectory(PathBuf);

impl AppDataDirectory {
    pub fn new(path_buf: PathBuf) -> Self {
        Self(path_buf)
    }

    pub fn get_path(&self) -> &PathBuf {
        &self.0
    }
}

impl AsRef<PathBuf> for AppDataDirectory {
    fn as_ref(&self) -> &PathBuf {
        &self.0
    }
}
