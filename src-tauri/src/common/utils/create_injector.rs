use std::sync::Arc;

use injector::{injector::Injector, register_scope};
use tauri::Url;
use tokio::sync::Mutex;

use crate::backend::services::{
    authenticator::Authenticator, implementations::default_authenticator::DefaultAuthenticator,
};
#[cfg(test)]
use crate::common::utils::create_sqlite_pool::create_sqlite_pool;
#[cfg(not(test))]
use crate::common::utils::create_sqlite_pool::create_sqlite_pool_from_location;
use crate::database::database_connection_manager::DatabaseConnectionManager;
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::services::element_move_service::ElementMoveService;
use crate::elements::services::element_tree_service::ElementTreeService;
use crate::elements::services::implementations::default_element_move_service::DefaultElementMoveService;
use crate::elements::services::implementations::default_element_tree_service::DefaultElementTreeService;
use crate::fsrs::entities::fsrs_profile::FsrsProfile;
use crate::fsrs::repositories::fsrs_repository::FsrsRepository;
use crate::generated_code;
use crate::infrastructure::clients::brainy_backend_http_client::BrainyBackendHttpClient;
use crate::infrastructure::managers::sqlite::sqlite_database_connection_manager::SqliteDatabaseConnectionManager;
use crate::infrastructure::repositories::disk::disk_secrets_repository::DiskSecretsRepository;
use crate::infrastructure::repositories::disk::disk_settings_repository::DiskSettingsRepository;
use crate::infrastructure::repositories::sqlite::sqlite_card_repository::SqliteCardRepository;
use crate::infrastructure::repositories::sqlite::sqlite_element_repository::SqliteElementRepository;
use crate::infrastructure::repositories::sqlite::sqlite_extract_repository::SqliteExtractRepository;
use crate::infrastructure::repositories::sqlite::sqlite_folder_repository::SqliteFolderRepository;
use crate::infrastructure::repositories::sqlite::sqlite_fsrs_repository::SqliteFsrsRepository;
use crate::infrastructure::repositories::sqlite::sqlite_local_configuration_repository::SqliteLocalConfigurationRepository;
use crate::infrastructure::repositories::sqlite::sqlite_reading_repository::SqliteReadingRepository;
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
    backend::clients::brainy_backend_client::BrainyBackendClient,
    backup::services::{
        backup_service::BackupService,
        implementations::default_backup_service::DefaultBackupService,
    },
    settings::services::{
        implementations::{
            default_settings_dto_provider::DefaultSettingsDtoProvider,
            default_settings_updater::DefaultSettingsUpdater,
        },
        settings_dto_provider::SettingsDtoProvider,
        settings_updater::SettingsUpdater,
    },
    sync::{
        entities::deleted_entity::DeletedEntity,
        services::{
            implementations::default_syncer::DefaultSyncer,
            syncer::{SyncLock, Syncer},
        },
        strategies::{
            implementations::{
                deleted_entity_strategy::DefaultDeletedEntityStrategy,
                fsrs_profile_strategy::DefaultFsrsProfileStrategy,
            },
            sync_entity_strategy::SyncEntityStrategy,
        },
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
        Arc::new(DiskSecretsRepository::new(&app_data_directory));
    injector.register_singleton::<dyn SecretsRepository>(secrets_repository.clone());

    // Backend

    #[cfg(debug_assertions)]
    let backend_url = Url::parse("http://localhost:5078").expect("Cannot construct backend url");
    #[cfg(not(debug_assertions))]
    let backend_url =
        Url::parse("https://api.brainylearn.app").expect("Cannot construct backend url");

    injector.register_singleton::<dyn BrainyBackendClient>(Arc::new(
        BrainyBackendHttpClient::new(backend_url, secrets_repository)
            .await
            .expect("Cannot create backend client"),
    ));

    // Local configuration

    register_scope!(
        injector,
        dyn LocalConfigurationRepository,
        SqliteLocalConfigurationRepository
    );

    // Elements

    register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
    register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
    register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
    register_scope!(injector, dyn CardRepository, SqliteCardRepository);
    register_scope!(injector, dyn ElementRepository, SqliteElementRepository);

    register_scope!(injector, dyn ElementTreeService, DefaultElementTreeService);
    register_scope!(injector, dyn ElementMoveService, DefaultElementMoveService);

    // FSRS

    register_scope!(injector, dyn FsrsRepository, SqliteFsrsRepository);

    // Settings

    injector.register_singleton(Arc::new(Mutex::new(settings)));
    register_scope!(
        injector,
        dyn SettingsDtoProvider,
        DefaultSettingsDtoProvider
    );
    register_scope!(injector, dyn SettingsUpdater, DefaultSettingsUpdater);
    register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);

    // Syncer

    injector.register_singleton(Arc::new(SyncLock(Mutex::new(()))));
    register_scope!(injector, dyn SyncRepository, SqliteSyncRepository);
    register_scope!(
        injector,
        dyn SyncEntityStrategy<Input = generated_code::FsrsProfile, Entity = FsrsProfile>,
        DefaultFsrsProfileStrategy
    );
    register_scope!(
        injector,
        dyn SyncEntityStrategy<Input = generated_code::DeletedEntity, Entity = DeletedEntity>,
        DefaultDeletedEntityStrategy
    );
    register_scope!(injector, dyn Syncer, DefaultSyncer);

    // Backup

    register_scope!(injector, dyn BackupService, DefaultBackupService);

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
    use crate::test_utils::create_temp_directory;

    use super::*;

    #[tokio::test]
    pub async fn validate_created_injector() {
        // Arrange

        let app_data_directory = AppDataDirectory::new(create_temp_directory().await);
        let injector = create_injector(app_data_directory).await;

        // Act & Assert

        injector.validate().await;
    }
}
