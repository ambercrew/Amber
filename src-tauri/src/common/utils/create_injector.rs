use std::sync::Arc;

use injector::{injector::Injector, register_scope};
use tauri::Url;
use tokio::sync::Mutex;

use crate::ai_integration::repositories::ai_repository::AiRepository;
use crate::ai_integration::services::ai_client_provider::AiClientProvider;
use crate::ai_integration::services::implementations::default_ai_client_provider::DefaultAiClientProvider;
use crate::backend::services::{
    authenticator::Authenticator, implementations::default_authenticator::DefaultAuthenticator,
};
use crate::cells::repositories::cell_repository::CellRepository;
use crate::cells::repositories::review_repository::ReviewRepository;
use crate::cells::services::cell_deleter::CellDeleter;
use crate::cells::services::cell_mover::CellMover;
use crate::cells::services::review_registrar::ReviewRegistrar;
#[cfg(test)]
use crate::common::utils::create_sqlite_pool::create_sqlite_pool;
#[cfg(not(test))]
use crate::common::utils::create_sqlite_pool::create_sqlite_pool_from_location;
use crate::database::database_connection_manager::DatabaseConnectionManager;
use crate::file_system::repositories::file_repository::FileRepository;
use crate::file_system::repositories::folder_repository::FolderRepository;
use crate::fsrs::repositories::fsrs_repository::FsrsRepository;
use crate::infrastructure::clients::brainy_backend_http_client::BrainyBackendHttpClient;
use crate::infrastructure::managers::sqlite::sqlite_database_connection_manager::SqliteDatabaseConnectionManager;
use crate::infrastructure::repositories::disk::disk_settings_repository::DiskSettingsRepository;
use crate::infrastructure::repositories::keyring::keyring_secrets_repository::KeyringSecretsRepository;
use crate::infrastructure::repositories::sqlite::sqlite_ai_repository::SqliteAiRepository;
use crate::infrastructure::repositories::sqlite::sqlite_cell_repository::SqliteCellRepository;
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
use crate::secrets::repositories::secrets_repository::SecretsRepository;
use crate::settings::entities::settings::Settings;
use crate::settings::repositories::settings_repository::SettingsRepository;
#[cfg(not(test))]
use crate::settings::value_objects::settings_profile::SettingsProfile;
use crate::sync::repositories::sync_repository::SyncRepository;
use crate::{
    ai_integration::{
        ai_state::AiState,
        services::{
            ai_streamer::AiStreamer,
            ai_tool_call_acceptor::AiToolCallAcceptor,
            document_uploader::DocumentUploader,
            implementations::{
                default_ai_streamer::DefaultAiStreamer,
                default_ai_tool_call_acceptor::DefaultAiToolCallAcceptor,
                default_document_uploader::DefaultDocumentUploader,
            },
        },
    },
    backend::clients::brainy_backend_client::BrainyBackendClient,
    backup::services::{
        backup_service::BackupService,
        implementations::default_backup_service::DefaultBackupService,
    },
    cells::services::{
        cell_creator::CellCreator, cell_fsrs_provider::CellFsrsProvider,
        cell_invariants_enforcer::CellInvariantsEnforcer,
        implementations::default_cell_creator::DefaultCellCreator,
        implementations::default_cell_deleter::DefaultCellDeleter,
        implementations::default_cell_fsrs_provider::DefaultCellFsrsProvider,
        implementations::default_cell_invariants_enforcer::DefaultCellInvariantsEnforcer,
        implementations::default_cell_mover::DefaultCellMover,
        implementations::default_review_registrar::DefaultReviewRegistrar,
    },
    file_system::services::{
        implementations::{
            default_item_creator::DefaultItemCreator, default_item_exporter::DefaultItemExporter,
            default_item_importer::DefaultItemImporter, default_item_mover::DefaultItemMover,
            default_item_renamer::DefaultItemRenamer,
            default_review_tree_builder::DefaultReviewTreeBuilder,
        },
        item_creator::{FileCreator, FolderCreator},
        item_exporter::ItemExporter,
        item_importer::ItemImporter,
        item_mover::{FileMover, FolderMover},
        item_renamer::{FileRenamer, FolderRenamer},
        review_tree_builder::ReviewTreeBuilder,
    },
    fsrs::services::{
        fsrs_profile_deleter::FsrsProfileDeleter,
        fsrs_profile_resolver::FsrsProfileResolver,
        implementations::{
            default_fsrs_profile_deleter::DefaultFsrsProfileDeleter,
            default_fsrs_profile_resolver::DefaultFsrsProfileResolver,
        },
    },
    settings::services::{
        implementations::default_settings_updater::DefaultSettingsUpdater,
        settings_updater::SettingsUpdater,
    },
    sync::services::{
        implementations::default_syncer::DefaultSyncer,
        syncer::{SyncLock, Syncer},
    },
};

pub async fn create_injector(app_data_directory: AppDataDirectory) -> Injector {
    let mut injector = Injector::default();

    #[cfg(not(test))]
    let settings = DiskSettingsRepository::get_or_create_settings(
        &app_data_directory,
        Settings::new(
            app_data_directory.get_path().clone(),
            SettingsProfile::Default,
        ),
    )
    .await
    .expect("Cannot get or create settings");

    #[cfg(test)]
    let settings = Settings::default();

    // Sqlite & Database

    #[cfg(not(test))]
    let sqlite_pool = create_sqlite_pool_from_location(&settings.database_location())
        .await
        .expect("Error connecting to Sqlite database");

    #[cfg(test)]
    let sqlite_pool = create_sqlite_pool("sqlite::memory:")
        .await
        .expect("Error connecting to Sqlite database");

    let db_pool = DbPool::new(sqlite_pool, settings.database_location().clone());
    injector.register_singleton(Arc::new(db_pool));
    register_scoped_tx(&mut injector);

    // Secret repository

    let secrets_repository: Arc<dyn SecretsRepository> =
        Arc::new(KeyringSecretsRepository::new("brainy"));
    injector.register_singleton::<dyn SecretsRepository>(secrets_repository.clone());

    // Backend

    #[cfg(debug_assertions)]
    let backend_url = Url::parse("http://localhost:5078").expect("Cannot construct backend url");
    #[cfg(not(debug_assertions))]
    let backend_url =
        Url::parse("https://api.brainylearn.app").expect("Cannot construct backend url");

    injector.register_singleton::<dyn BrainyBackendClient>(Arc::new(
        BrainyBackendHttpClient::new(backend_url, secrets_repository)
            .expect("Cannot create backend client"),
    ));

    // Local configuration

    register_scope!(
        injector,
        dyn LocalConfigurationRepository,
        SqliteLocalConfigurationRepository
    );

    // Cell

    register_scope!(injector, dyn CellCreator, DefaultCellCreator);
    register_scope!(injector, dyn CellDeleter, DefaultCellDeleter);
    register_scope!(injector, dyn CellFsrsProvider, DefaultCellFsrsProvider);
    register_scope!(
        injector,
        dyn CellInvariantsEnforcer,
        DefaultCellInvariantsEnforcer
    );
    register_scope!(injector, dyn CellMover, DefaultCellMover);
    register_scope!(injector, dyn ReviewRegistrar, DefaultReviewRegistrar);

    register_scope!(injector, dyn CellRepository, SqliteCellRepository);
    register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);

    // File system

    register_scope!(injector, dyn FileRepository, SqliteFileRepository);
    register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);

    register_scope!(injector, dyn FolderCreator, DefaultItemCreator);
    register_scope!(injector, dyn FileCreator, DefaultItemCreator);

    register_scope!(injector, dyn ItemExporter, DefaultItemExporter);
    register_scope!(injector, dyn ItemImporter, DefaultItemImporter);

    register_scope!(injector, dyn FolderMover, DefaultItemMover);
    register_scope!(injector, dyn FileMover, DefaultItemMover);

    register_scope!(injector, dyn FolderRenamer, DefaultItemRenamer);
    register_scope!(injector, dyn FileRenamer, DefaultItemRenamer);

    register_scope!(injector, dyn ReviewTreeBuilder, DefaultReviewTreeBuilder);

    // FSRS

    register_scope!(injector, dyn FsrsRepository, SqliteFsrsRepository);
    register_scope!(injector, dyn FsrsProfileDeleter, DefaultFsrsProfileDeleter);
    register_scope!(
        injector,
        dyn FsrsProfileResolver,
        DefaultFsrsProfileResolver
    );

    // Settings

    injector.register_singleton(Arc::new(Mutex::new(settings)));
    register_scope!(injector, dyn SettingsUpdater, DefaultSettingsUpdater);
    register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);

    // Syncer

    injector.register_singleton(Arc::new(SyncLock(Mutex::new(()))));
    register_scope!(injector, dyn SyncRepository, SqliteSyncRepository);
    register_scope!(injector, dyn Syncer, DefaultSyncer);

    // Backup

    register_scope!(injector, dyn BackupService, DefaultBackupService);

    // AI

    injector.register_singleton(Arc::new(AiState::default()));
    register_scope!(injector, dyn AiRepository, SqliteAiRepository);
    register_scope!(injector, dyn AiClientProvider, DefaultAiClientProvider);
    register_scope!(injector, dyn AiStreamer, DefaultAiStreamer);
    register_scope!(injector, dyn AiToolCallAcceptor, DefaultAiToolCallAcceptor);
    register_scope!(injector, dyn DocumentUploader, DefaultDocumentUploader);

    // Auth

    register_scope!(injector, dyn Authenticator, DefaultAuthenticator);
    register_scope!(
        injector,
        dyn DatabaseConnectionManager,
        SqliteDatabaseConnectionManager
    );

    // Other

    injector.register_singleton(Arc::new(app_data_directory.clone()));

    injector
}

pub fn register_scoped_tx(injector: &mut Injector) {
    injector.register_scope_factory::<DbTransaction>(|scope| {
        Box::pin(async move {
            let db_pool = scope.resolve::<DbPool>().await;
            let pool = db_pool.pool().await;
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
