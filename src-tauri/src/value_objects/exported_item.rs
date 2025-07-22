use serde::{Deserialize, Serialize};

use crate::entity::cell::{self, CellType};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedItem {
    pub path: String,
    pub item_type: ExportedItemType,
    pub cells: Option<Vec<ExportedCell>>,
    pub children: Option<Vec<ExportedItem>>,
}

impl ExportedItem {
    pub fn new(
        path: String,
        item_type: ExportedItemType,
        cells: Option<Vec<ExportedCell>>,
        children: Option<Vec<ExportedItem>>,
    ) -> Self {
        Self {
            path,
            item_type,
            cells,
            children,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedCell {
    pub content: String,
    pub cell_type: CellType,
}

impl From<cell::Model> for ExportedCell {
    fn from(value: cell::Model) -> Self {
        ExportedCell {
            cell_type: value.cell_type,
            content: value.content,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ExportedItemType {
    File,
    Folder,
}
