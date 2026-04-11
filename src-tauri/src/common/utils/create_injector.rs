use std::sync::Arc;

use injector::{injector::Injector, register_scope};
use tauri::Url;
use tokio::sync::Mutex;

use crate::ai_integration::repositories::ai_repository::AiRepository;
use crate::backup::repositories::backup_repository::BackupRepository;
use crate::cells::repositories::cell_repository::CellRepository;
use crate::cells::repositories::review_repository::ReviewRepository;
use crate::database::database_connection_manager::DatabaseConnectionManager;
use crate::file_system::repositories::file_repository::FileRepository;
use crate::file_system::repositories::folder_repository::FolderRepository;
use crate::fsrs::repositories::fsrs_repository::FsrsRepository;
use crate::infrastructure::clients::brainy_backend_http_client::BrainyBackendHttpClient;
use crate::infrastructure::repositories::disk::disk_settings_repository::DiskSettingsRepository;
use crate::infrastructure::repositories::sqlite::sqlite_ai_repository::SqliteAiRepository;
use crate::infrastructure::repositories::sqlite::sqlite_backup_repository::SqliteBackupRepository;
use crate::infrastructure::repositories::sqlite::sqlite_cell_repository::SqliteCellRepository;
use crate::infrastructure::repositories::sqlite::sqlite_database_connection_manager::SqliteDatabaseConnectionManager;
use crate::infrastructure::repositories::sqlite::sqlite_file_repository::SqliteFileRepository;
use crate::infrastructure::repositories::sqlite::sqlite_folder_repository::SqliteFolderRepository;
use crate::infrastructure::repositories::sqlite::sqlite_fsrs_repository::SqliteFsrsRepository;
use crate::infrastructure::repositories::sqlite::sqlite_local_configuration_repository::SqliteLocalConfigurationRepository;
use crate::infrastructure::repositories::sqlite::sqlite_review_repository::SqliteReviewRepository;
use crate::infrastructure::repositories::sqlite::sqlite_sync_repository::SqliteSyncRepository;
use crate::infrastructure::value_objects::app_data_directory::AppDataDirectory;
use crate::infrastructure::value_objects::db_pool::DbPool;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;
use crate::local_configurations::repositories::local_configuration_repository::LocalConfigurationRepository;
#[cfg(test)]
use crate::settings::entities::settings::Settings;
#[cfg(not(test))]
use crate::settings::entities::settings::{Settings, SettingsProfile};
use crate::settings::repositories::settings_repository::SettingsRepository;
use crate::sync::repositories::sync_repository::SyncRepository;
use crate::{
    ai_integration::{ai_service::AiService, ai_state::AiState},
    backend::clients::brainy_backend_client::BrainyBackendClient,
    backup::backup_service::BackupService,
    cells::cell_service::CellService,
    common::utils::create_sqlite_pool::create_sqlite_pool,
    file_system::file_system_service::FileSystemService,
    fsrs::fsrs_service::FsrsService,
    settings::settings_service::SettingsService,
    sync::sync_service::{SyncLock, SyncService},
};

pub async fn create_injector(app_data_directory: AppDataDirectory) -> Injector {
    let mut injector = Injector::default();

    injector.register_singleton(Arc::new(app_data_directory.clone()));

    #[cfg(not(test))]
    let settings = DiskSettingsRepository::init_settings_and_get(
        &app_data_directory,
        Settings::new(
            app_data_directory.get_path().clone(),
            SettingsProfile::Default,
        ),
    )
    .await
    .unwrap();

    #[cfg(test)]
    let settings = Settings::default();

    #[cfg(not(test))]
    let sqlite_pool =
        create_sqlite_pool(&format!("sqlite:///{}", settings.get_database_location()))
            .await
            .expect("Error connecting to Sqlite database");

    #[cfg(test)]
    let sqlite_pool = create_sqlite_pool("sqlite::memory:")
        .await
        .expect("Error connecting to Sqlite database");

    let db_pool = DbPool::new(Mutex::new(sqlite_pool));

    injector.register_singleton(Arc::new(db_pool));

    let backend_url = Url::parse("http://localhost:5078").unwrap();
    injector.register_singleton::<dyn BrainyBackendClient>(Arc::new(
        BrainyBackendHttpClient::new(backend_url).expect("Cannot create backend client"),
    ));

    injector.register_singleton(Arc::new(Mutex::new(settings)));
    injector.register_singleton(Arc::new(AiState::default()));
    injector.register_singleton(Arc::new(SyncLock(Mutex::new(()))));

    register_scope!(injector, dyn AiRepository, SqliteAiRepository);
    register_scope!(injector, dyn BackupRepository, SqliteBackupRepository);
    register_scope!(injector, dyn CellRepository, SqliteCellRepository);
    register_scope!(injector, dyn FileRepository, SqliteFileRepository);
    register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
    register_scope!(injector, dyn FsrsRepository, SqliteFsrsRepository);
    register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
    register_scope!(injector, dyn SyncRepository, SqliteSyncRepository);
    register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
    register_scope!(
        injector,
        dyn LocalConfigurationRepository,
        SqliteLocalConfigurationRepository
    );

    register_scope!(injector, AiService);
    register_scope!(injector, BackupService);
    register_scope!(injector, CellService);
    register_scope!(injector, FileSystemService);
    register_scope!(injector, FsrsService);
    register_scope!(injector, SyncService);
    register_scope!(injector, SettingsService);

    register_scope!(
        injector,
        dyn DatabaseConnectionManager,
        SqliteDatabaseConnectionManager
    );

    register_scoped_tx(&mut injector);

    injector
}

pub fn register_scoped_tx(injector: &mut Injector) {
    injector.register_scope_factory::<DbTransaction>(|scope| {
        Box::pin(async move {
            let pool = scope.resolve::<DbPool>().await;
            let pool = pool.lock().await;
            let tx = pool.begin().await.expect("Cannot create a new transaction");
            let db_transaction = DbTransaction::new(Mutex::new(tx));
            Arc::new(db_transaction)
        })
    });
}

#[cfg(test)]
mod tests {
    use crate::{
        ai_integration::clients::mock_client::MockClient, test_utils::create_temp_directory,
    };

    use super::*;

    #[tokio::test]
    pub async fn validate_created_injector() {
        // Arrange

        let app_data_directory = AppDataDirectory::new(create_temp_directory().await);
        let mut injector = create_injector(app_data_directory).await;

        // Needed for testing.
        injector.register_singleton(Arc::new(MockClient::default()));

        // Act & Assert

        injector.validate().await;
    }
}
