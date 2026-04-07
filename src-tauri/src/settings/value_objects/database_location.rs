use serde::{Deserialize, Serialize};
use std::{fmt::Display, path::PathBuf, str::FromStr};
use thiserror::Error;

#[derive(Default, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DatabaseLocation(PathBuf);

#[derive(Debug, Error, PartialEq, Eq)]
pub enum DatabaseLocationError {
    #[error("Database path must not be empty")]
    EmptyPath,
    #[error("Database path must point to a file, got: {0}")]
    NotAFile(PathBuf),
}

impl DatabaseLocation {
    pub fn new(path_buf: PathBuf) -> Result<Self, DatabaseLocationError> {
        if path_buf.as_os_str().is_empty() {
            return Err(DatabaseLocationError::EmptyPath);
        }
        if path_buf.file_name().is_none() {
            return Err(DatabaseLocationError::NotAFile(path_buf));
        }
        Ok(Self(path_buf))
    }

    pub fn get_path(&self) -> &PathBuf {
        &self.0
    }

    pub fn file_name(&self) -> &str {
        self.0
            .file_name()
            .expect("invariant: file_name is always present")
            .to_str()
            .expect("invariant: path is valid UTF-8")
    }

    pub fn directory(&self) -> &std::path::Path {
        self.0.parent().unwrap_or_else(|| std::path::Path::new("."))
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

impl<'a> From<&'a DatabaseLocation> for &'a str {
    fn from(value: &'a DatabaseLocation) -> Self {
        value.0.to_str().unwrap()
    }
}

impl TryFrom<&String> for DatabaseLocation {
    type Error = DatabaseLocationError;

    fn try_from(value: &String) -> Result<Self, Self::Error> {
        Self::new(PathBuf::from_str(value).unwrap())
    }
}
