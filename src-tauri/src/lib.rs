mod api;
mod dto;

use std::sync::Arc;

use brainy_core::{
    cells::cell_service::CellService,
    common::{
        sqlite_repositories_context::SqliteRepositoriesContext,
        traits::repositories_context::RepositoriesContext,
    },
    file_system::file_system_service::FileSystemService,
    settings::Settings,
};
use tauri::Manager;

use api::*;
use tauri_plugin_window_state::StateFlags;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub async fn run() -> Result<(), String> {
    simple_logger::init_with_level(log::Level::Info).unwrap();

    let settings = &Settings::init_settings_and_get().await.unwrap();

    let repositories_context = SqliteRepositoriesContext::new_with_migration(&format!(
        "sqlite:///{}",
        settings.database_location
    ))
    .await
    .unwrap();

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
        .setup(move |app| {
            let cell_service = Arc::new(CellService::new(
                repositories_context.cell_repository(),
                repositories_context.review_repository(),
            ));
            app.manage(cell_service.clone());

            app.manage(Arc::new(FileSystemService::new(
                cell_service,
                repositories_context.folder_repository(),
                repositories_context.file_repository(),
                repositories_context.cell_repository(),
            )));
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
