mod ai_integration;
mod backend;
mod backup;
mod cells;
mod common;
mod file_system;
mod fsrs;
mod local_configurations;
mod settings;
mod sync;
#[cfg(test)]
mod test_utils;

use std::sync::Arc;
use std::time::Duration;

use tauri::Manager;

use ai_integration::ai_api::{
    accept_tool_call, delete_ai_chat, get_all_ai_chats_sorted_by_date_desc,
    get_chat_messages_ordered, reject_tool_call, rename_ai_chat, stop_ai_generation,
    stream_ai_response, upload_document,
};
use backend::api::auth_api::{
    is_signed_in, resend_email_verification_code, sign_in, sign_out, sign_up, update_password,
    verify_user_email,
};
use backend::api::user_api::{delete_user, get_user_information, update_user_information};
use cells::api::cell_api::{
    create_cell, delete_cell, get_cells_for_files_with_fsrs_profile_ids,
    get_file_cells_ordered_by_index, move_cell, update_cells_contents,
};
use cells::api::repetition_api::{get_study_repetition_counts, reset_repetitions_for_cell};
use cells::api::review_api::{get_home_statistics, register_review};
use cells::api::search_api::search_cells;
use file_system::api::file_system_api::{
    create_file, create_folder, delete_file, delete_folder, get_review_tree_folder_for_root,
    move_file, move_folder, rename_file, rename_folder,
};
use fsrs::fsrs_api::{
    create_profile, delete_fsrs_profile, get_all_fsrs_profiles, get_file_fsrs_profile,
    get_folder_fsrs_profile, get_fsrs_profile_choice_for_file, get_fsrs_profile_choice_for_folder,
    get_parent_fsrs_profile_for_file, get_parent_fsrs_profile_for_folder,
    set_fsrs_profile_choice_for_file, set_fsrs_profile_choice_for_folder, update_profile,
};
use settings::settings_api::{get_settings, update_settings};

pub use sync::sync_api::sync;

pub use file_system::api::export_import_api::{export_file, export_folder, import};

#[cfg(desktop)]
use tauri_plugin_window_state::StateFlags;
use tokio::runtime::Handle;

use crate::backup::backup_service::{BackupService, TIME_BETWEEN_BACKUPS_IN_MINUTES};
use crate::common::utils::create_injector::create_injector;
use crate::settings::value_objects::settings_directory::SettingsDirectory;

pub type Guid = uuid::Uuid;

pub const ROOT_FOLDER_ID: Guid = uuid::uuid!("00000000-0000-0000-0000-000000000001");
pub const DEFAULT_FSRS_PROFILE_ID: Guid = uuid::uuid!("00000000-0000-0000-0000-000000000002");

pub mod generated_code {
    include!(concat!(env!("OUT_DIR"), "/generated_code.rs"));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() -> Result<(), String> {
    simple_logger::init_with_level(log::Level::Info).unwrap();

    let mut tauri_builder =
        tauri::Builder::default().plugin(tauri_plugin_clipboard_manager::init());

    #[cfg(desktop)]
    {
        tauri_builder = tauri_builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    tauri_builder = tauri_builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init());

    #[cfg(desktop)]
    {
        tauri_builder = tauri_builder.plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION)
                .build(),
        );
    }

    tauri_builder
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Cannot get settings directory");
            let settings_directory = SettingsDirectory::new(app_data_dir);

            let injector = Arc::new(tokio::task::block_in_place(|| {
                Handle::current().block_on(create_injector(settings_directory))
            }));

            app.manage(injector.clone());

            #[cfg(all(dev, desktop))]
            {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_title("Brainy - development");
            }

            // Starting backup service.
            tokio::spawn(async move {
                let mut interval =
                    tokio::time::interval(Duration::from_mins(TIME_BETWEEN_BACKUPS_IN_MINUTES));

                loop {
                    interval.tick().await;
                    let scope = injector.start_scope();

                    if let Err(err) = scope.resolve::<BackupService>().await.ensure_backup().await {
                        log::error!("An error happened when creating a backup {:?}", err);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Cells
            create_cell,
            delete_cell,
            get_cells_for_files_with_fsrs_profile_ids,
            get_file_cells_ordered_by_index,
            move_cell,
            update_cells_contents,
            // Search
            search_cells,
            // File System
            create_file,
            create_folder,
            delete_file,
            delete_folder,
            get_review_tree_folder_for_root,
            move_file,
            move_folder,
            rename_file,
            rename_folder,
            // Repetitions
            get_study_repetition_counts,
            reset_repetitions_for_cell,
            // Review
            get_home_statistics,
            register_review,
            // Settings
            get_settings,
            update_settings,
            // Export/Import
            export_file,
            export_folder,
            import,
            // Auth
            is_signed_in,
            resend_email_verification_code,
            sign_in,
            sign_out,
            sign_up,
            update_password,
            verify_user_email,
            // User
            delete_user,
            get_user_information,
            update_user_information,
            // Sync
            sync,
            // FSRS
            create_profile,
            delete_fsrs_profile,
            get_all_fsrs_profiles,
            get_file_fsrs_profile,
            get_folder_fsrs_profile,
            get_fsrs_profile_choice_for_file,
            get_fsrs_profile_choice_for_folder,
            get_parent_fsrs_profile_for_file,
            get_parent_fsrs_profile_for_folder,
            set_fsrs_profile_choice_for_file,
            set_fsrs_profile_choice_for_folder,
            update_profile,
            // AI
            accept_tool_call,
            delete_ai_chat,
            get_all_ai_chats_sorted_by_date_desc,
            get_chat_messages_ordered,
            reject_tool_call,
            rename_ai_chat,
            stop_ai_generation,
            stream_ai_response,
            upload_document,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
