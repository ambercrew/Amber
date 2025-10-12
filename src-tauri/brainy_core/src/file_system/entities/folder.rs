use crate::{
    Guid, file_system::value_objects::file_system_item_name::FileSystemItemName, generated_code,
};

#[derive(Debug, Clone)]
pub struct Folder {
    id: Guid,
    parent_id: Option<Guid>,
    name: FileSystemItemName,
}

impl Folder {
    pub(in crate::file_system) fn new(
        id: Option<Guid>,
        parent_id: Option<Guid>,
        name: FileSystemItemName,
    ) -> Folder {
        Folder {
            id: id.unwrap_or(Guid::new_v4()),
            parent_id,
            name,
        }
    }

    /// Used for unit testing, or repositories when reconsturcting a folder.
    pub fn new_unchecked(
        id: Option<Guid>,
        parent_id: Option<Guid>,
        name: FileSystemItemName,
    ) -> Self {
        Folder {
            id: id.unwrap_or(Guid::new_v4()),
            parent_id,
            name,
        }
    }

    pub fn id(&self) -> Guid {
        self.id
    }

    pub fn parent_id(&self) -> Option<Guid> {
        self.parent_id
    }

    pub fn name(&self) -> FileSystemItemName {
        self.name.clone()
    }

    pub(in crate::file_system) fn set_name(&mut self, new_name: FileSystemItemName) {
        self.name = new_name;
    }

    pub(in crate::file_system) fn set_parent_id(&mut self, parent_id: Option<Guid>) {
        self.parent_id = parent_id;
    }
}

impl From<generated_code::Folder> for Folder {
    fn from(value: generated_code::Folder) -> Self {
        Self {
            id: Guid::parse_str(&value.id).unwrap(),
            parent_id: value
                .parent_id
                .map(|parent_id| Guid::parse_str(&parent_id).unwrap()),
            name: FileSystemItemName::new_unchecked(value.name),
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    #[test]
    fn new_with_id_created_folder_correctly() {
        // Arrange

        let id = Guid::new_v4();

        // Act

        let actual = Folder::new(Some(id), None, "test".try_into().unwrap());

        // Assert

        assert_eq!(id, actual.id());
        assert_eq!(None, actual.parent_id());
        assert_eq!(
            FileSystemItemName::new_unchecked("test".to_string()),
            actual.name()
        );
    }

    #[test]
    fn new_without_id_generated_id_automatically() {
        // Act

        let actual = Folder::new(
            None,
            Some(Guid::new_v4()),
            FileSystemItemName::new_unchecked("test".to_string()),
        );

        // Assert

        assert_ne!(Guid::nil(), actual.id());
        assert_ne!(None, actual.parent_id());
    }
}
