use std::{collections::HashSet, fmt::Display};

use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::{
    Guid,
    cells::{
        entities::repetition::Repetition,
        models::{flash_card::FlashCard, true_false::TrueFalse},
    },
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CellType {
    FlashCard,
    Note,
    Cloze,
    TrueFalse,
}

impl Display for CellType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            serde_json::to_string(self).expect("Cannot serialize CellType")
        )
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cell {
    id: Guid,
    created_date: DateTime<Utc>,
    modified_date: DateTime<Utc>,
    file_id: Guid,
    content: String,
    cell_type: CellType,
    searchable_content: String,
    index: u32,
    pub(in crate::cells) repetitions: Vec<Repetition>,
}

impl Cell {
    pub(in crate::cells) fn new(
        id: Option<Guid>,
        file_id: Guid,
        content: String,
        cell_type: CellType,
        index: u32,
    ) -> Self {
        let mut output = Self {
            id: id.unwrap_or(Guid::new_v4()),
            created_date: Utc::now(),
            modified_date: Utc::now(),
            file_id,
            content,
            cell_type,
            index,
            searchable_content: "".to_string(),
            repetitions: Vec::new(),
        };

        output.update_searchable_content();
        output.update_repetitions();
        output
    }

    /// Used for unit testing, or repositories when reconstructing a cell.
    #[allow(clippy::too_many_arguments)]
    pub fn new_unchecked(
        id: Guid,
        created_date: DateTime<Utc>,
        modified_date: DateTime<Utc>,
        file_id: Guid,
        content: String,
        cell_type: CellType,
        index: u32,
        searchable_content: String,
        repetitions: Vec<Repetition>,
    ) -> Self {
        Self {
            id,
            created_date,
            modified_date,
            file_id,
            content,
            cell_type,
            index,
            searchable_content,
            repetitions,
        }
    }

    pub fn id(&self) -> Guid {
        self.id
    }

    pub fn created_date(&self) -> DateTime<Utc> {
        self.created_date
    }

    pub fn modified_date(&self) -> DateTime<Utc> {
        self.modified_date
    }

    pub fn file_id(&self) -> Guid {
        self.file_id
    }

    pub fn content(&self) -> &str {
        &self.content
    }

    pub fn cell_type(&self) -> &CellType {
        &self.cell_type
    }

    pub fn index(&self) -> u32 {
        self.index
    }

    pub fn searchable_content(&self) -> &str {
        &self.searchable_content
    }

    pub(in crate::cells) fn set_index(&mut self, index: u32) {
        self.index = index;
    }

    pub fn repetitions(&self) -> &Vec<Repetition> {
        &self.repetitions
    }

    pub fn reset_repetitions(&mut self) {
        self.repetitions = Vec::new();
        self.update_repetitions();
    }

    pub fn set_content(&mut self, content: String) {
        self.content = content;
        self.update_searchable_content();
        self.update_repetitions();
    }

    fn create_repetition_with_content(&mut self, additional_content: Option<String>) {
        self.repetitions.push(Repetition {
            id: Guid::new_v4(),
            file_id: self.file_id,
            cell_id: self.id,
            additional_content,
            ..Default::default()
        });
    }

    fn update_searchable_content(&mut self) {
        let remove_html_regex = Regex::new("<[^>]*>").expect("Invalid regex");

        let searchable_content = match self.cell_type {
            CellType::Cloze => remove_html_regex.replace_all(&self.content, "").to_string(),
            CellType::Note => remove_html_regex.replace_all(&self.content, "").to_string(),
            CellType::FlashCard => {
                let flash_card: FlashCard =
                    serde_json::from_str(&self.content).expect("Cannot parse flash card JSON!");
                remove_html_regex
                    .replace_all(
                        &format!("{} {}", flash_card.question, flash_card.answer),
                        "",
                    )
                    .to_string()
            }
            CellType::TrueFalse => {
                let true_false: TrueFalse =
                    serde_json::from_str(&self.content).expect("Cannot parse true false JSON!");
                remove_html_regex
                    .replace_all(&true_false.question, "")
                    .to_string()
            }
        };

        self.searchable_content = searchable_content.to_string();
    }

    fn update_repetitions(&mut self) {
        match self.cell_type {
            CellType::Note => (),
            CellType::FlashCard | CellType::TrueFalse => {
                if self.repetitions.is_empty() {
                    self.create_repetition_with_content(None);
                }
            }
            CellType::Cloze => {
                self.update_repetitions_for_cloze_cell();
            }
        }
    }

    fn update_repetitions_for_cloze_cell(&mut self) {
        let re = Regex::new("<cloze[^>]*index=\"(\\d+)\"[^>]*>").expect("Invalid regex");
        let indices: HashSet<String> = re
            .captures_iter(&self.content)
            .map(|c| c.extract())
            .map(|c: (&str, [&str; 1])| c.1[0].to_string())
            .collect();

        self.repetitions
            .retain(|repetition| match repetition.additional_content.as_ref() {
                Some(additional_content) => indices.contains(additional_content),
                None => false,
            });

        for index in indices {
            if !self
                .repetitions
                .iter()
                .any(|c| c.additional_content == Some(index.clone()))
            {
                self.create_repetition_with_content(Some(index));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    pub fn new_flash_card_set_search_content_and_repetitions_correctly() {
        // Arrange

        let content = serde_json::to_string(&FlashCard {
            question: "question".into(),
            answer: "<bold>Answer</bold>".into(),
        })
        .unwrap();

        // Act

        let actual = Cell::new(None, Guid::new_v4(), content, CellType::FlashCard, 0);

        // Assert

        assert_eq!("question Answer".to_string(), actual.searchable_content());
        assert_eq!(1, actual.repetitions().len());
    }

    #[test]
    pub fn new_cloze_added_repetitions_correctly() {
        // Arrange

        let content = r#"<cloze index="1">Test</cloze>"#.to_string();

        // Act

        let actual = Cell::new(None, Guid::new_v4(), content, CellType::Cloze, 0);

        // Assert

        assert_eq!(1, actual.repetitions().len());
        assert_eq!(
            "1",
            actual.repetitions()[0]
                .additional_content
                .as_ref()
                .unwrap()
                .as_str()
        );
    }

    #[test]
    pub fn set_content_on_true_false_updated_search_content_correctly() {
        // Arrange

        let old_content = serde_json::to_string(&TrueFalse {
            question: "<bold>Old content</bold>".into(),
            is_true: true,
        })
        .unwrap();
        let new_content = serde_json::to_string(&TrueFalse {
            question: "<bold>Question</bold>".into(),
            is_true: true,
        })
        .unwrap();

        let mut cell = Cell::new(None, Guid::new_v4(), old_content, CellType::TrueFalse, 0);

        // Act

        cell.set_content(new_content);

        // Assert

        assert_eq!(cell.searchable_content(), "Question".to_string());
    }

    #[test]
    pub fn new_note_updated_search_content_correctly() {
        // Act

        let actual = Cell::new(
            None,
            Guid::new_v4(),
            "<bold>Note</bold>".to_string(),
            CellType::Note,
            0,
        );

        // Assert

        assert_eq!(actual.searchable_content(), "Note".to_string());
    }

    #[test]
    pub fn set_content_on_cloze_added_new_repetitions_correctly() {
        // Arrange

        let old_content = r#"<cloze index="1">Test</cloze>"#.to_string();
        let mut cell = Cell::new(None, Guid::new_v4(), old_content, CellType::Cloze, 0);
        let new_content = r#"
            <cloze index="1">Test 1</cloze>
            <cloze index="2">Test 2</cloze>
        "#
        .to_string();

        // Act

        cell.set_content(new_content);

        // Assert

        assert_eq!(2, cell.repetitions().len());
        assert_eq!(
            "1",
            cell.repetitions()[0]
                .additional_content
                .as_ref()
                .unwrap()
                .as_str()
        );
        assert_eq!(
            "2",
            cell.repetitions()[1]
                .additional_content
                .as_ref()
                .unwrap()
                .as_str()
        );
    }

    #[test]
    pub fn set_content_on_cloze_deleted_old_repetitions_correctly() {
        // Arrange

        let old_content = r#"
            <cloze index="1">Test 1</cloze>
            <cloze index="2">Test 2</cloze>
        "#
        .to_string();
        let mut cell = Cell::new(None, Guid::new_v4(), old_content, CellType::Cloze, 0);
        let new_content = r#"<cloze index="1">Test</cloze>"#.to_string();

        // Act

        cell.set_content(new_content);

        // Assert

        assert_eq!(1, cell.repetitions().len());
        assert_eq!(
            "1",
            cell.repetitions()[0]
                .additional_content
                .as_ref()
                .unwrap()
                .as_str()
        );
    }

    #[test]
    pub fn reset_repetitions_valid_input_reseted_repetitions() {
        // Arrange

        let content = serde_json::to_string(&FlashCard {
            question: "question".into(),
            answer: "<bold>Answer</bold>".into(),
        })
        .unwrap();
        let mut cell = Cell::new(None, Guid::new_v4(), content, CellType::FlashCard, 0);
        // Doing random modificaiton on the cell.
        cell.repetitions[0].difficulty = 99f64;

        // Act

        cell.reset_repetitions();

        // Assert

        assert_eq!(0f64, cell.repetitions[0].difficulty);
    }
}
