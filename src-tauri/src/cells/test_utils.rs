use chrono::Utc;

use crate::{
    Guid,
    cells::entities::cell::{Cell, CellType},
};

pub fn create_cell(
    id: Option<Guid>,
    file_id: Guid,
    content: String,
    cell_type: CellType,
    index: u32,
) -> Cell {
    let mut cell = Cell::new_unchecked(
        id.unwrap_or(Guid::new_v4()),
        Utc::now(),
        Utc::now(),
        file_id,
        "".into(),
        cell_type,
        index,
        "".into(),
        Vec::new(),
    );
    cell.set_content(content);
    cell
}
