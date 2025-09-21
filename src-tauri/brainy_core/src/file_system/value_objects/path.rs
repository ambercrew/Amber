use std::fmt::Display;

use serde::{Serialize, Serializer};
use thiserror::Error;

use crate::file_system::value_objects::file_system_item_name::{
    FileSystemItemName, FileSystemItemNameError,
};

/// Represents the path of a file.
#[derive(Clone, Debug, Hash, PartialEq, Eq, Default)]
pub struct Path(Vec<FileSystemItemName>);

#[derive(Error, Debug, PartialEq, Eq)]
pub enum PathError {
    #[error("Root does not have a parent!")]
    RootDoesNotHaveParent,
    #[error("{0}")]
    FileSystemItemNameError(#[from] FileSystemItemNameError),
}

impl Path {
    pub fn parent_directory(&self) -> Result<Path, PathError> {
        if self.0.is_empty() {
            return Err(PathError::RootDoesNotHaveParent);
        }

        let parent_segments = self
            .0
            .clone()
            .into_iter()
            .take(self.0.len() - 1)
            .collect::<Vec<_>>();
        Ok(Self(parent_segments))
    }

    pub fn navigate(&self, name: FileSystemItemName) -> Self {
        let mut segments = self.0.clone();
        segments.push(name);
        segments.into()
    }
}

/// Creates a path from a string, the string may contain forward slashes that
/// will be used for splitting into segments.
impl TryFrom<&str> for Path {
    type Error = PathError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        let segments = value.split('/').map(|segment| segment.trim());

        let mut non_empty_segments = Vec::new();
        for segment in segments {
            if !segment.is_empty() {
                non_empty_segments.push(FileSystemItemName::try_from(segment)?);
            }
        }
        Ok(non_empty_segments.into())
    }
}

impl From<Vec<FileSystemItemName>> for Path {
    fn from(value: Vec<FileSystemItemName>) -> Self {
        Path(value)
    }
}

impl From<FileSystemItemName> for Path {
    fn from(value: FileSystemItemName) -> Self {
        Path(vec![value])
    }
}

impl Display for Path {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "/{}",
            self.0
                .iter()
                .map(|item| item.to_string())
                .collect::<Vec<_>>()
                .join("/")
        )
    }
}

impl Serialize for Path {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    pub fn try_from_valid_input_parsed_correctly() {
        // Act

        let actual = Path::try_from("/root/folder 1");

        // Assert

        assert_eq!("/root/folder 1", actual.unwrap().to_string());
    }

    #[test]
    pub fn parent_directory_on_root_returned_error() {
        // Arrange

        let path = Path::try_from("").unwrap();

        // Act

        let actual = path.parent_directory();

        // Assert

        assert_eq!(Err(PathError::RootDoesNotHaveParent), actual);
    }

    #[test]
    pub fn parent_directory_on_valid_path_returned_error() {
        // Arrange

        let path = Path::try_from("/folder 1/folder 2").unwrap();

        // Act

        let actual = path.parent_directory();

        // Assert

        assert_eq!("/folder 1", actual.unwrap().to_string());
    }

    #[test]
    pub fn navigate_valid_input_navigated_correctly() {
        // Arrange

        let path = Path::try_from("/folder 1").unwrap();

        // Act

        let actual = path.navigate(FileSystemItemName::new_unchecked("folder 2".to_string()));

        // Assert

        assert_eq!("/folder 1/folder 2", actual.to_string());
    }
}
