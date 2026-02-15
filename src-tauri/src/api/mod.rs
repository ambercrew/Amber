mod ai_api;
mod auth_api;
mod cell_api;
mod dto;
mod export_import_api;
mod file_system_api;
mod fsrs_api;
mod repetition_api;
mod review_api;
mod search_api;
mod settings_api;
mod sync_api;
mod user_api;

use std::error::Error;

pub use repetition_api::{get_study_repetition_counts, reset_repetitions_for_cell};

pub use cell_api::{
    create_cell, delete_cell, get_cells_for_files_with_fsrs_profile_ids,
    get_file_cells_ordered_by_index, move_cell, update_cells_contents,
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

pub use auth_api::{
    is_signed_in, resend_email_verification_code, sign_in, sign_out, sign_up, update_password,
    verify_user_email,
};

pub use user_api::{delete_user, get_user_information, update_user_information};

pub use fsrs_api::{
    create_profile, delete_fsrs_profile, get_all_fsrs_profiles, get_file_fsrs_profile,
    get_folder_fsrs_profile, get_fsrs_profile_choice_for_file, get_fsrs_profile_choice_for_folder,
    get_parent_fsrs_profile_for_file, get_parent_fsrs_profile_for_folder,
    set_fsrs_profile_choice_for_file, set_fsrs_profile_choice_for_folder, update_profile,
};

pub use sync_api::sync;

pub use ai_api::{
    delete_ai_chat, get_all_ai_chats_sorted_by_date_desc, get_chat_messages_ordered,
    stop_ai_generation, stream_ai_response,
};

#[derive(Serialize)]
pub struct ApiError(String);

impl ApiError {
    pub fn new(err: String) -> Self {
        Self(err)
    }
}

impl<T> From<T> for ApiError
where
    T: Error,
{
    fn from(value: T) -> Self {
        log::error!("An error occurred: {:#?}", value);
        ApiError(value.to_string())
    }
}
