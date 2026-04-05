use std::sync::Arc;

use injector::{injector::Injector, register_scope};
use tauri::Url;
use tokio::sync::Mutex;

#[cfg(test)]
use crate::settings::entities::settings::Settings;
use crate::settings::value_objects::settings_directory::SettingsDirectory;
use crate::{
    ai_integration::{
        ai_service::AiService,
        ai_state::AiState,
        repositories::{
            sqlite_ai_repository::SqliteAiRepository, traits::ai_repository::AiRepository,
        },
    },
    backend::{
        brainy_backend_http_client::BrainyBackendHttpClient,
        traits::brainy_backend_client::BrainyBackendClient,
    },
    backup::{
        backup_service::BackupService, repositories::traits::backup_repository::BackupRepository,
        sqlite_backup_repository::SqliteBackupRepository,
    },
    cells::{
        cell_service::CellService,
        repositories::{
            sqlite_cell_repository::SqliteCellRepository,
            sqlite_review_repository::SqliteReviewRepository,
            traits::{cell_repository::CellRepository, review_repository::ReviewRepository},
        },
    },
    common::{DbPool, DbTransaction, utils::create_sqlite_pool::create_sqlite_pool},
    file_system::{
        file_system_service::FileSystemService,
        repositories::{
            sqlite_file_repository::SqliteFileRepository,
            sqlite_folder_repository::SqliteFolderRepository,
            traits::{file_repository::FileRepository, folder_repository::FolderRepository},
        },
    },
    fsrs::{
        entities::repositories::{
            sqlite_fsrs_repository::SqliteFsrsRepository, traits::fsrs_repository::FsrsRepository,
        },
        fsrs_service::FsrsService,
    },
    local_configurations::repositories::{
        sqlite_local_configuration_repository::SqliteLocalConfigurationRepository,
        traits::local_configuration_repository::LocalConfigurationRepository,
    },
    settings::{
        repositories::{
            disk_settings_repository::DiskSettingsRepository,
            traits::settings_repository::SettingsRepository,
        },
        settings_service::SettingsService,
    },
    sync::{
        repositories::{
            sqlite_sync_repository::SqliteSyncRepository, traits::sync_repository::SyncRepository,
        },
        sync_service::{SyncLock, SyncService},
    },
};

pub async fn create_injector(settings_directory: SettingsDirectory) -> Injector {
    let mut injector = Injector::default();

    injector.register_singleton(Arc::new(settings_directory.clone()));

    #[cfg(not(test))]
    let settings = DiskSettingsRepository::init_settings_and_get(&settings_directory)
        .await
        .unwrap();

    #[cfg(test)]
    let settings = Settings::default();

    #[cfg(not(test))]
    let pool = create_sqlite_pool(&format!("sqlite:///{}", settings.database_location))
        .await
        .expect("Error connecting to Sqlite database");

    #[cfg(test)]
    let pool = create_sqlite_pool("sqlite::memory:")
        .await
        .expect("Error connecting to Sqlite database");

    injector.register_singleton(Arc::new(pool));

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
    register_scoped_tx(&mut injector);

    injector
}

pub fn register_scoped_tx(injector: &mut Injector) {
    injector.register_scope_factory::<Mutex<DbTransaction>>(|scope| {
        Box::pin(async move {
            let pool = scope.resolve::<DbPool>().await;
            let pool = pool.lock().await;
            let tx = pool.begin().await.expect("Cannot create a new transaction");
            Arc::new(Mutex::new(tx))
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

        let settings_directory = SettingsDirectory::new(create_temp_directory().await);
        let mut injector = create_injector(settings_directory).await;

        // Needed for testing.
        injector.register_singleton(Arc::new(MockClient::default()));

        // Act & Assert

        injector.validate().await;
    }
}
