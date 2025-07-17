mod api;
mod dto;
mod entity;
mod migration;
mod model;
mod service;
mod util;

use service::settings_service;
use tauri::Manager;

use api::*;
use tauri_plugin_window_state::StateFlags;
use tokio::sync::Mutex;
use util::database_util::load_database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() -> Result<(), String> {
    settings_service::init_settings();
    let db_conn = load_database(&settings_service::get_settings().database_location).await;

    let mut tauri_builder = tauri::Builder::default();

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
        .setup(|app| {
            app.manage(Mutex::new(db_conn));
            #[cfg(dev)]
            {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_title("Brainy - development");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Cells
            create_cell,
            delete_cell,
            get_cells_for_files,
            get_file_cells_ordered_by_index,
            move_cell,
            update_cells_contents,
            // Search
            search_cells,
            // Files & Folders
            create_file,
            create_folder,
            delete_file,
            delete_folder,
            get_files,
            move_file,
            move_folder,
            rename_file,
            rename_folder,
            // Repetitions
            get_file_repetitions,
            get_repetitions_for_files,
            get_study_repetition_counts,
            reset_repetitions_for_cell,
            // Review
            get_home_statistics,
            register_review,
            // Settings
            get_settings,
            update_settings,
            // Export/Import
            export,
            import,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
