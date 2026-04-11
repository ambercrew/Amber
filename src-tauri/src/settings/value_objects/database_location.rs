use serde::{Deserialize, Serialize};
use std::{fmt::Display, path::PathBuf};

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DatabaseLocation(pub(in crate::settings) PathBuf);

impl DatabaseLocation {
    pub fn new_unchecked(path_buf: PathBuf) -> Self {
        Self(path_buf)
    }

    pub fn get_path(&self) -> &PathBuf {
        &self.0
    }
}

impl AsRef<PathBuf> for DatabaseLocation {
    fn as_ref(&self) -> &PathBuf {
        &self.0
    }
}

impl Display for DatabaseLocation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.display().fmt(f)
    }
}
