use std::collections::HashMap;

use crate::{
    Guid, ROOT_FOLDER_ID,
    cells::models::file_repetitions_count::FileRepetitionCounts,
    file_system::{
        entities::{file::File, folder::Folder},
        value_objects::file_system_item_name::FileSystemItemName,
    },
};
use serde::Serialize;
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewTreeFolder {
    pub id: Guid,
    pub name: FileSystemItemName,
    pub repetition_counts: FileRepetitionCounts,
    pub subfolders: Vec<ReviewTreeFolder>,
    pub files: Vec<ReviewTreeFile>,
}

#[derive(Clone, Debug, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewTreeFile {
    pub id: Guid,
    pub name: FileSystemItemName,
    pub repetition_counts: FileRepetitionCounts,
}

impl ReviewTreeFolder {
    /// Parses the given folder and files into a file tree folder with the root
    /// as the first element. The two lists must contain every folder and file
    /// in the entire system including root.
    pub fn parse_file_system_from_root(
        folders: &[Folder],
        files: &[File],
        mut study_repetitions: HashMap<Guid, FileRepetitionCounts>,
    ) -> ReviewTreeFolder {
        let mut folder_subfolders_by_id = HashMap::new();
        for folder in folders.iter() {
            folder_subfolders_by_id
                .entry(folder.parent_id())
                .or_insert(Vec::new())
                .push(folder);
        }

        let mut folder_files_by_id = HashMap::new();
        for file in files.iter() {
            folder_files_by_id
                .entry(file.parent_id())
                .or_insert(Vec::new())
                .push(file);
        }

        let root_folder = folders
            .iter()
            .find(|f| f.id() == ROOT_FOLDER_ID)
            .expect("Cannot find root!");

        Self::parse_folder(
            root_folder,
            &mut study_repetitions,
            &folder_subfolders_by_id,
            &folder_files_by_id,
        )
    }

    fn parse_folder(
        folder: &Folder,
        study_repetitions: &mut HashMap<Guid, FileRepetitionCounts>,
        folder_subfolders_by_id: &HashMap<Option<Uuid>, Vec<&Folder>>,
        folder_files_by_id: &HashMap<Option<Uuid>, Vec<&File>>,
    ) -> ReviewTreeFolder {
        let mut result = ReviewTreeFolder {
            id: folder.id(),
            name: folder.name(),
            repetition_counts: FileRepetitionCounts::default(),
            subfolders: Vec::new(),
            files: Vec::new(),
        };

        for subfolder in folder_subfolders_by_id
            .get(&Some(folder.id()))
            .unwrap_or(&Vec::new())
        {
            let parsed_subfolder = Self::parse_folder(
                subfolder,
                study_repetitions,
                folder_subfolders_by_id,
                folder_files_by_id,
            );
            result.repetition_counts += &parsed_subfolder.repetition_counts;
            result.subfolders.push(parsed_subfolder);
        }

        for file in folder_files_by_id
            .get(&Some(folder.id()))
            .unwrap_or(&Vec::new())
        {
            let parsed_file = ReviewTreeFile {
                id: file.id(),
                name: file.name(),
                repetition_counts: study_repetitions.remove(&file.id()).unwrap_or_default(),
            };

            result.repetition_counts += &parsed_file.repetition_counts;
            result.files.push(parsed_file);
        }

        result
    }
}

#[cfg(test)]
pub mod tests {
    use crate::{
        ROOT_FOLDER_ID, file_system::value_objects::fsrs_profile_choice::FsrsProfileChoice,
    };
    use chrono::Utc;

    use super::*;

    #[test]
    pub fn parse_file_system_from_root_valid_input_parsed_correctly() {
        // Arrange

        let parent_folder_id = Guid::new_v4();
        let folders: Vec<Folder> = vec![
            Folder::new_unchecked(
                ROOT_FOLDER_ID,
                Utc::now(),
                Utc::now(),
                None,
                "root".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ),
            Folder::new_unchecked(
                parent_folder_id,
                Utc::now(),
                Utc::now(),
                Some(ROOT_FOLDER_ID),
                "parent folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ),
        ];

        let files: Vec<File> = vec![
            File::new_unchecked(
                Guid::new_v4(),
                Utc::now(),
                Utc::now(),
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ),
            File::new_unchecked(
                Guid::new_v4(),
                Utc::now(),
                Utc::now(),
                Some(parent_folder_id),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ),
        ];

        let mut study_repetitions = HashMap::new();
        study_repetitions.insert(
            files[0].id(),
            FileRepetitionCounts {
                new: 4,
                ..Default::default()
            },
        );
        study_repetitions.insert(
            files[1].id(),
            FileRepetitionCounts {
                new: 1,
                learning: 2,
                ..Default::default()
            },
        );

        // Act

        let mut actual =
            ReviewTreeFolder::parse_file_system_from_root(&folders, &files, study_repetitions);

        // Assert

        assert_eq!(ROOT_FOLDER_ID, actual.id);
        assert_eq!(
            FileSystemItemName::new_unchecked("root".to_string()),
            actual.name
        );
        assert_eq!(5, actual.repetition_counts.new);
        assert_eq!(2, actual.repetition_counts.learning);
        assert_eq!(0, actual.repetition_counts.relearning);
        assert_eq!(0, actual.repetition_counts.review);

        assert_eq!(1, actual.subfolders.len());
        assert_eq!(1, actual.files.len());

        let root_file = actual.files.remove(0);
        assert_eq!(files[0].id(), root_file.id);
        assert_eq!(files[0].name(), root_file.name);
        assert_eq!(4, root_file.repetition_counts.new);

        let mut root_subfolder = actual.subfolders.remove(0);
        assert_eq!(folders[1].id(), root_subfolder.id);
        assert_eq!(folders[1].name(), root_subfolder.name);
        assert_eq!(1, root_subfolder.repetition_counts.new);
        assert_eq!(2, root_subfolder.repetition_counts.learning);

        assert_eq!(0, root_subfolder.subfolders.len());
        assert_eq!(1, root_subfolder.files.len());

        let nested_file = root_subfolder.files.remove(0);
        assert_eq!(files[1].id(), nested_file.id);
        assert_eq!(files[1].name(), nested_file.name);
        assert_eq!(1, nested_file.repetition_counts.new);
        assert_eq!(2, nested_file.repetition_counts.learning);
    }
}
