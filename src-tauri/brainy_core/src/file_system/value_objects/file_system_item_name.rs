use std::fmt::Display;

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// A common value ojbect used to represent the name of a folder or a file.
#[derive(Debug, Clone, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct FileSystemItemName(String);

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FileSystemItemNameError {
    #[error("Name cannot be empty!")]
    EmptyName,
    #[error("{0}")]
    InvalidName(&'static str),
}

impl FileSystemItemName {
    pub fn new_unchecked(name: String) -> FileSystemItemName {
        FileSystemItemName(name)
    }
}

impl TryFrom<&str> for FileSystemItemName {
    type Error = FileSystemItemNameError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        Self::try_from(value.to_string())
    }
}

impl TryFrom<String> for FileSystemItemName {
    type Error = FileSystemItemNameError;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        let name = value.trim().to_string();
        if name.is_empty() {
            return Err(FileSystemItemNameError::EmptyName);
        } else if name.contains('/') {
            return Err(FileSystemItemNameError::InvalidName(
                "The name cannot contain forward slash!",
            ));
        }
        Ok(FileSystemItemName(name))
    }
}

impl Display for FileSystemItemName {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    fn try_from_empty_name_returned_error() {
        // Act

        let actual = FileSystemItemName::try_from("  ");

        // Assert

        assert_eq!(Err(FileSystemItemNameError::EmptyName), actual);
    }

    #[test]
    fn try_from_containing_slash_in_name_returned_error() {
        // Act

        let actual = FileSystemItemName::try_from("file 1/file2");

        // Assert

        assert_eq!(
            Err(FileSystemItemNameError::InvalidName(
                "The name cannot contain forward slash!"
            )),
            actual
        );
    }

    #[test]
    fn try_from_valid_name_returned_result() {
        // Act

        let actual = FileSystemItemName::try_from("file 1");

        // Assert

        assert_eq!(
            Ok(FileSystemItemName::new_unchecked("file 1".to_string())),
            actual
        );
    }
}
