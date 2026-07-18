mod app_info;
mod backend;
mod backup;
mod common;
mod database;
mod elements;
mod import;
mod infrastructure;
mod local_configurations;
mod secrets;
mod settings;
mod study;
mod sync;
#[cfg(test)]
mod test_utils;

use std::sync::Arc;
use std::time::Duration;

use tauri::Manager;

use app_info::app_info_api::*;
use backend::api::auth_api::*;
use backend::api::user_api::*;
use elements::elements_api::*;
use import::import_api::*;
use settings::settings_api::*;
use study::study_api::*;
use study::study_profile_api::*;

pub use sync::sync_api::sync;

#[cfg(desktop)]
use tauri_plugin_window_state::StateFlags;
use tokio::runtime::Handle;

use crate::backup::services::backup_service::{BackupService, TIME_BETWEEN_BACKUPS_IN_MINUTES};
use crate::common::utils::create_injector::create_injector;
use crate::infrastructure::extensions::unit_of_work::UnitOfWorkExt;
use crate::infrastructure::value_objects::app_data_directory::AppDataDirectory;

pub use common::types::SourceError;

pub mod generated_code {
    include!(concat!(env!("OUT_DIR"), "/generated_code.rs"));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() -> Result<(), String> {
    let mut tauri_builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_clipboard_manager::init());

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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init());

    #[cfg(desktop)]
    {
        tauri_builder = tauri_builder
            .plugin(tauri_plugin_process::init())
            .plugin(
                tauri_plugin_window_state::Builder::new()
                    .with_state_flags(StateFlags::SIZE | StateFlags::POSITION)
                    .build(),
            )
            .plugin(tauri_plugin_updater::Builder::new().build());
    }

    tauri_builder
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Cannot get the data directory");
            let app_data_directory = AppDataDirectory::new(app_data_dir);

            let injector = Arc::new(tokio::task::block_in_place(|| {
                Handle::current().block_on(create_injector(app_data_directory))
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
                interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

                loop {
                    interval.tick().await;
                    let scope = injector.start_scope();

                    if let Err(err) = scope
                        .resolve::<dyn BackupService>()
                        .await
                        .ensure_backup()
                        .await
                    {
                        log::error!("An error happened when creating a backup {:?}", err);
                    }

                    if let Err(err) = scope.save_changes().await {
                        log::error!("An error happened when saving changes for backup {:?}", err);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Settings
            get_settings,
            update_settings,
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
            // Elements
            get_element_tree,
            get_element_by_id,
            delete_element,
            rename_element,
            element_exists,
            move_element,
            update_element_tags,
            create_folder,
            create_reading,
            create_extract,
            create_card,
            update_reading,
            update_reading_position,
            get_reading_split_manifest,
            get_reading_split_content,
            update_extract,
            update_card,
            // Study
            get_card_review,
            get_reading_review,
            get_due_elements,
            grade_card,
            preview_card_review,
            next_reading,
            preview_next_reading,
            finish_reading,
            unfinish_reading,
            // Study profiles
            list_study_profiles,
            create_study_profile,
            update_study_profile,
            delete_study_profile,
            clone_study_profile,
            set_default_study_profile,
            assign_study_profile,
            get_effective_study_profile,
            // Import
            fetch_page,
            fetch_image,
            // App Info
            is_store_installed,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
