mod auth_api;
mod cell_api;
mod export_import_api;
mod file_system_api;
mod repetition_api;
mod review_api;
mod search_api;
mod settings_api;

use std::error::Error;

pub use repetition_api::{get_study_repetition_counts, reset_repetitions_for_cell};

pub use cell_api::{
    create_cell, delete_cell, get_cells_for_files, get_file_cells_ordered_by_index, move_cell,
    update_cells_contents,
};

pub use file_system_api::{
    create_file, create_folder, delete_file, delete_folder, get_review_tree_folder_for_root,
    move_file, move_folder, rename_file, rename_folder,
};

pub use search_api::search_cells;

pub use export_import_api::{export_file, export_folder, import};

use serde::Serialize;
pub use settings_api::{get_settings, update_settings};

pub use review_api::{get_home_statistics, register_review};

pub use auth_api::{get_user_information, login, signup, is_signed_in, update_user_information};

#[derive(Serialize)]
pub struct ApiError(String);

impl<T> From<T> for ApiError
where
    T: Error,
{
    fn from(value: T) -> Self {
        log::error!("An error occured: {:#?}", value);
        ApiError(value.to_string())
    }
}
