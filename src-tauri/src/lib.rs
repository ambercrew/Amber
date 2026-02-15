// TODO: refactor file
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

use std::{sync::Arc, time::Duration};

#[cfg(test)]
use crate::ai_integration::clients::mock_client::MockClient;
use crate::{
    ai_integration::{ai_service::AiService, ai_state::AiState},
    backend::{
        brainy_backend_http_client::BrainyBackendHttpClient,
        traits::brainy_backend_client::BrainyBackendClient,
    },
    backup::backup_service::{BackupService, TIME_BETWEEN_BACKUPS_IN_MINUTES},
    cells::cell_service::CellService,
    common::{
        sqlite_repositories_context::SqliteRepositoriesContext,
        traits::repositories_context::RepositoriesContext,
    },
    file_system::file_system_service::FileSystemService,
    fsrs::fsrs_service::FsrsService,
    settings::{Settings, get_settings_dir},
    sync::sync_service::SyncService,
};
use reqwest::Url;
use tauri::Manager;

use ai_integration::ai_api::{
    delete_ai_chat, get_all_ai_chats_sorted_by_date_desc, get_chat_messages_ordered,
    stop_ai_generation, stream_ai_response,
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

use tauri_plugin_window_state::StateFlags;
use tokio::sync::Mutex;

pub type Guid = uuid::Uuid;

pub const ROOT_FOLDER_ID: Guid = uuid::uuid!("00000000-0000-0000-0000-000000000001");
pub const DEFAULT_FSRS_PROFILE_ID: Guid = uuid::uuid!("00000000-0000-0000-0000-000000000002");

pub mod generated_code {
    include!(concat!(env!("OUT_DIR"), "/generated_code.rs"));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() -> Result<(), String> {
    simple_logger::init_with_level(log::Level::Info).unwrap();

    let settings_directory = get_settings_dir()
        .await
        .expect("Cannot get settings directory!");
    let settings = Settings::init_settings_and_get(settings_directory.clone())
        .await
        .unwrap();

    let repositories_context = SqliteRepositoriesContext::new_with_migration(&format!(
        "sqlite:///{}",
        settings.database_location
    ))
    .await
    .unwrap();

    let mut tauri_builder =
        tauri::Builder::default().plugin(tauri_plugin_clipboard_manager::init());

    let backend_url = Url::parse("http://localhost:5078").unwrap();
    let backend_client =
        BrainyBackendHttpClient::new(backend_url).expect("Cannot create backend client");
    let backend_client = Arc::new(backend_client) as Arc<dyn BrainyBackendClient>;

    #[cfg(desktop)]
    {
        tauri_builder = tauri_builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    tauri_builder
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::SIZE | StateFlags::POSITION)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            let cell_service = Arc::new(CellService::new(
                repositories_context.cell_repository(),
                repositories_context.review_repository(),
            ));
            app.manage(cell_service.clone());

            app.manage(Arc::new(FileSystemService::new(
                cell_service.clone(),
                repositories_context.folder_repository(),
                repositories_context.file_repository(),
                repositories_context.cell_repository(),
            )));
            app.manage(Arc::new(SyncService::new(
                backend_client.clone(),
                repositories_context.folder_repository(),
                repositories_context.file_repository(),
                repositories_context.cell_repository(),
                repositories_context.review_repository(),
                repositories_context.sync_repository(),
                repositories_context.local_configuration_repository(),
                repositories_context.fsrs_repository(),
                cell_service.clone(),
            )));

            app.manage(Arc::new(FsrsService::new(
                repositories_context.folder_repository(),
                repositories_context.fsrs_repository(),
            )));

            let backup_service = BackupService::new(
                repositories_context.local_configuration_repository(),
                repositories_context.backup_repository(),
                settings_directory,
            );

            app.manage(backend_client);

            let settings = Arc::new(Mutex::new(settings));

            app.manage(settings.clone());

            let ai_state = Arc::new(AiState::default());
            app.manage(Arc::new(AiService::new(
                settings,
                ai_state.clone(),
                repositories_context.ai_repository(),
                #[cfg(test)]
                MockClient {
                    model: None,
                    stream_fn: Arc::new(None),
                    completion_fn: Arc::new(None),
                },
            )));
            app.manage(ai_state);

            app.manage(
                Arc::new(Mutex::new(repositories_context)) as Arc<Mutex<dyn RepositoriesContext>>
            );

            #[cfg(dev)]
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

                    if let Err(err) = backup_service.ensure_backup().await {
                        log::error!(
                            "An error happened when saving a backup of your files {:?}",
                            err
                        );
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
            sign_in,
            sign_up,
            sign_out,
            is_signed_in,
            verify_user_email,
            resend_email_verification_code,
            update_password,
            // User
            get_user_information,
            update_user_information,
            delete_user,
            // Sync
            sync,
            // FSRS
            get_all_fsrs_profiles,
            get_file_fsrs_profile,
            get_folder_fsrs_profile,
            get_parent_fsrs_profile_for_file,
            get_parent_fsrs_profile_for_folder,
            create_profile,
            update_profile,
            get_fsrs_profile_choice_for_file,
            get_fsrs_profile_choice_for_folder,
            set_fsrs_profile_choice_for_file,
            set_fsrs_profile_choice_for_folder,
            delete_fsrs_profile,
            // AI
            stream_ai_response,
            stop_ai_generation,
            get_all_ai_chats_sorted_by_date_desc,
            delete_ai_chat,
            get_chat_messages_ordered,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
