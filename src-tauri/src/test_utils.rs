use std::{env, path::PathBuf, sync::Arc};

use injector::injector::Injector;
use tokio::fs;

use crate::{
    Guid,
    common::utils::{create_injector::register_scoped_tx, create_sqlite_pool::create_sqlite_pool},
    infrastructure::{
        repositories::disk::disk_secrets_repository::DiskSecretsRepository,
        value_objects::{app_data_directory::AppDataDirectory, db_pool::DbPool},
    },
    secrets::repositories::secrets_repository::SecretsRepository,
    settings::value_objects::database_location::DatabaseLocation,
};

pub async fn create_temp_directory() -> PathBuf {
    let path = env::temp_dir().join(Guid::new_v4().to_string());
    fs::create_dir_all(path.clone()).await.unwrap();
    path
}

pub async fn create_test_injector() -> Injector {
    let mut injector = Injector::default();

    let app_data_directory = AppDataDirectory::new(create_temp_directory().await);
    injector.register_singleton(Arc::new(app_data_directory.clone()));

    let sqlite_pool = create_sqlite_pool("sqlite::memory:").await.unwrap();
    let database_location = DatabaseLocation::new_unchecked(app_data_directory.get_path().clone());

    let db_pool = DbPool::new(sqlite_pool, database_location);
    injector.register_singleton(Arc::new(db_pool));
    register_scoped_tx(&mut injector);

    let secrets_repository = DiskSecretsRepository::new(&app_data_directory);
    injector.register_singleton::<dyn SecretsRepository>(Arc::new(secrets_repository));

    injector
}
