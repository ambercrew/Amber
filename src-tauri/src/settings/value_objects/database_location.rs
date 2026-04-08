use serde::{Deserialize, Serialize};
use std::{fmt::Display, path::PathBuf};
use thiserror::Error;

const DATABASE_FILE_NAME: &str = "brainy.db";

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DatabaseLocationProfile {
    #[default]
    Default,
    User(String),
}

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DatabaseLocation {
    base_dir: PathBuf,
    profile: DatabaseLocationProfile,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum DatabaseLocationError {
    #[error("Database base directory must not be empty")]
    EmptyPath,
}

impl DatabaseLocation {
    pub fn new(
        base_dir: PathBuf,
        profile: DatabaseLocationProfile,
    ) -> Result<Self, DatabaseLocationError> {
        if base_dir.as_os_str().is_empty() {
            return Err(DatabaseLocationError::EmptyPath);
        }
        Ok(Self { base_dir, profile })
    }

    /// Returns the full path to the database file.
    /// If a profile is set: `<base_dir>/<profile>/brainy.db`
    /// Otherwise:           `<base_dir>/brainy.db`
    pub fn get_path(&self) -> PathBuf {
        self.database_directory().join(DATABASE_FILE_NAME)
    }

    /// The directory that contains the database file.
    pub fn database_directory(&self) -> PathBuf {
        match &self.profile {
            DatabaseLocationProfile::Default => self.base_dir.clone(),
            DatabaseLocationProfile::User(user) => self.base_dir.join(user),
        }
    }

    pub fn base_dir(&self) -> &PathBuf {
        &self.base_dir
    }

    pub fn profile(&self) -> &DatabaseLocationProfile {
        &self.profile
    }
}

impl Display for DatabaseLocation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.get_path().display().fmt(f)
    }
}
