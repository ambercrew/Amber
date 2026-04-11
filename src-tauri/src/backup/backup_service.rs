use std::sync::Arc;

use chrono::{DateTime, Duration, NaiveDateTime, TimeZone, Utc};
use injector_derive::ScopeInjectable;
use thiserror::Error;
use tokio::fs;

use crate::{
    backup::repositories::backup_repository::BackupRepository,
    common::repository_error::RepositoryError,
    local_configurations::{
        entities::local_configuration::LocalConfiguration,
        repositories::local_configuration_repository::LocalConfigurationRepository,
    },
    settings::repositories::settings_repository::SettingsRepository,
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum BackupServiceError {
    #[error(transparent)]
    Repository(#[from] RepositoryError),
    #[error("The application is not able to list the entries in the settings folder!")]
    CannotListEntriesInFolder(String),
}

pub const TIME_BETWEEN_BACKUPS_IN_MINUTES: u64 = 120;
const LAST_BACKUP_DATE_CONFIGURATION_NAME: &str = "LAST_SYNC_DATE";
const MAX_NUMBER_OF_BACKUPS: usize = 8;
const DATETIME_FORMAT_IN_FILE_NAMES: &str = "%Y_%m_%d_%H_%M_%S";

#[derive(ScopeInjectable)]
pub struct BackupService {
    local_configuration_repository: Arc<dyn LocalConfigurationRepository>,
    backup_repository: Arc<dyn BackupRepository>,
    settings_repository: Arc<dyn SettingsRepository>,
}

impl BackupService {
    /// This methods checks if the minimum time between backups have passed, and
    /// if so, it creates a new backup and saves it in the same directory as
    /// the settings. If the total number of backups exceeds [`MAX_NUMBER_OF_BACKUPS`]
    /// then it deletes the oldest backup.
    pub async fn ensure_backup(&self) -> Result<(), BackupServiceError> {
        let last_backup_date = self.get_last_backup_date().await?;

        if Utc::now() - last_backup_date < Duration::minutes(TIME_BETWEEN_BACKUPS_IN_MINUTES as i64)
        {
            return Ok(());
        }

        self.create_backup().await?;
        self.update_last_backup_date_to_now().await?;
        self.delete_extra_backups().await?;

        Ok(())
    }

    async fn get_last_backup_date(&self) -> Result<DateTime<Utc>, BackupServiceError> {
        let last_backup_date = self
            .local_configuration_repository
            .get_by_name(LAST_BACKUP_DATE_CONFIGURATION_NAME)
            .await?
            .map(|conf| {
                DateTime::parse_from_rfc3339(&conf.value)
                    .unwrap()
                    .with_timezone(&Utc)
            })
            .unwrap_or(Utc.with_ymd_and_hms(2000, 1, 1, 0, 0, 0).unwrap());

        log::info!("Last backup date is {}", last_backup_date);
        Ok(last_backup_date)
    }

    async fn create_backup(&self) -> Result<(), BackupServiceError> {
        let backup_name = format!(
            "{}.backup",
            Utc::now().format(DATETIME_FORMAT_IN_FILE_NAMES)
        );
        let settings = self.settings_repository.get_settings().await;
        let backup_path = settings
            .database_location()
            .database_directory()
            .join(backup_name);
        let backup_path_str = backup_path.to_string_lossy();

        log::info!("Creating a new backup at path {}", backup_path_str);
        self.backup_repository
            .create_backup(&backup_path_str)
            .await?;
        Ok(())
    }

    async fn update_last_backup_date_to_now(&self) -> Result<(), BackupServiceError> {
        self.local_configuration_repository
            .upsert(&LocalConfiguration {
                name: LAST_BACKUP_DATE_CONFIGURATION_NAME.to_string(),
                value: Utc::now().to_rfc3339(),
            })
            .await?;

        log::info!("Updating last backup date to now.");
        Ok(())
    }

    async fn delete_extra_backups(&self) -> Result<(), BackupServiceError> {
        let mut current_backups = Vec::new();
        let settings = self.settings_repository.get_settings().await;

        let mut entries =
            match fs::read_dir(&settings.database_location().database_directory()).await {
                Ok(entries) => entries,
                Err(err) => {
                    return Err(BackupServiceError::CannotListEntriesInFolder(
                        err.to_string(),
                    ));
                }
            };

        while let Some(entry) = entries.next_entry().await.unwrap() {
            let path = entry.path();

            if !path.is_file() {
                continue;
            }

            match path.extension() {
                Some(ext) if ext == "backup" => (),
                _ => continue,
            };

            let string_path = path.file_name().unwrap().to_string_lossy();
            log::info!("Found backup with path {string_path}");

            // Unwrap since we know it has an extension!
            let date_part = string_path.split('.').next().unwrap();
            match NaiveDateTime::parse_from_str(date_part, DATETIME_FORMAT_IN_FILE_NAMES) {
                Ok(date) => {
                    current_backups.push((date, path));
                }
                Err(_) => continue,
            };
        }

        if current_backups.len() > MAX_NUMBER_OF_BACKUPS {
            current_backups.sort_by_key(|a| a.0);
            log::info!(
                "Deleting old backup with path {}",
                current_backups[0].1.to_string_lossy()
            );
            let _ = fs::remove_file(current_backups[0].1.clone()).await;
        }

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use std::path::Path;

    use injector::{injector::Injector, register_scope};
    use tokio::sync::Mutex;

    use super::*;
    use crate::{
        common::utils::{
            create_injector::register_scoped_tx, create_sqlite_pool::create_sqlite_pool,
        },
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::{
                disk::disk_settings_repository::DiskSettingsRepository,
                sqlite::{
                    sqlite_backup_repository::SqliteBackupRepository,
                    sqlite_local_configuration_repository::SqliteLocalConfigurationRepository,
                },
            },
            value_objects::{app_data_directory::AppDataDirectory, db_pool::DbPool},
        },
        settings::{
            entities::settings::Settings,
            value_objects::database_location::{DatabaseLocation, DatabaseLocationProfile},
        },
        test_utils::create_temp_directory,
    };

    async fn initialize_test_injector() -> Injector {
        let path = create_temp_directory().await.join("brainy.db");
        create_injector_for_sqlite_path(&path).await
    }

    async fn create_injector_for_sqlite_path(path: &Path) -> Injector {
        let mut injector = Injector::default();

        let settings = Settings::new(
            DatabaseLocation::new(
                create_temp_directory().await,
                DatabaseLocationProfile::Default,
            )
            .unwrap(),
        );
        injector.register_singleton(Arc::new(Mutex::new(settings)));

        let app_data_directory = create_temp_directory().await;
        injector.register_singleton(Arc::new(AppDataDirectory::new(app_data_directory)));

        // Must use database that is saved on disk for backups to work.
        let sqlite_pool = create_sqlite_pool(&format!("sqlite:///{}", path.to_string_lossy()))
            .await
            .unwrap();
        let db_pool = DbPool::new(Mutex::new(sqlite_pool));
        injector.register_singleton(Arc::new(db_pool));
        register_scoped_tx(&mut injector);

        register_scope!(
            injector,
            dyn LocalConfigurationRepository,
            SqliteLocalConfigurationRepository
        );
        register_scope!(injector, dyn BackupRepository, SqliteBackupRepository);
        register_scope!(injector, dyn SettingsRepository, DiskSettingsRepository);
        register_scope!(injector, BackupService);

        injector
    }

    #[tokio::test]
    pub async fn ensure_backup_no_backups_created_backup() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let local_configuration_repository =
            scope.resolve::<dyn LocalConfigurationRepository>().await;
        let service = scope.resolve::<BackupService>().await;

        // Inserting a random row in the database to see if it exists in the new backup.
        local_configuration_repository
            .upsert(&LocalConfiguration {
                name: "test_configuration".into(),
                value: "value".into(),
            })
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        service.ensure_backup().await.unwrap();

        // Assert

        let settings_repository = scope.resolve::<dyn SettingsRepository>().await;
        let settings = settings_repository.get_settings().await;
        let mut dir_entries = fs::read_dir(settings.database_location().database_directory())
            .await
            .unwrap();
        let backup = dir_entries.next_entry().await.unwrap().unwrap();
        let backup_injector = create_injector_for_sqlite_path(&backup.path()).await;

        let backup_injector_scope = backup_injector.start_scope();

        let configuration = backup_injector_scope
            .resolve::<dyn LocalConfigurationRepository>()
            .await
            .get_by_name("test_configuration")
            .await
            .unwrap()
            .unwrap();

        assert_eq!(configuration.value, "value");
    }

    #[tokio::test]
    pub async fn ensure_backup_two_calls_in_row_only_created_backup_once() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let local_configuration_repository =
            scope.resolve::<dyn LocalConfigurationRepository>().await;
        let service = scope.resolve::<BackupService>().await;

        // Act

        service.ensure_backup().await.unwrap();

        // Assert

        let settings_repository = scope.resolve::<dyn SettingsRepository>().await;
        let settings = settings_repository.get_settings().await;
        let mut dir_entries = fs::read_dir(settings.database_location().database_directory())
            .await
            .unwrap();
        dir_entries.next_entry().await.unwrap().unwrap();
        assert!(dir_entries.next_entry().await.unwrap().is_none());

        let last_backup_date = DateTime::parse_from_rfc3339(
            &local_configuration_repository
                .get_by_name(LAST_BACKUP_DATE_CONFIGURATION_NAME)
                .await
                .unwrap()
                .unwrap()
                .value,
        )
        .unwrap()
        .with_timezone(&Utc);

        assert!((Utc::now() - last_backup_date) <= Duration::seconds(5));
    }

    #[tokio::test]
    pub async fn ensure_backup_multiple_files_deleted_oldest_file() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let backup_repository = scope.resolve::<dyn BackupRepository>().await;
        let settings_repository = scope.resolve::<dyn SettingsRepository>().await;
        let settings = settings_repository.get_settings().await;
        let service = scope.resolve::<BackupService>().await;

        let mut oldest_backup_path = None;

        for i in 0..MAX_NUMBER_OF_BACKUPS {
            let path = settings
                .database_location()
                .database_directory()
                .join(format!(
                    "{}.backup",
                    Utc.with_ymd_and_hms(2000, 1, 1, 0, 0, i as u32)
                        .unwrap()
                        .format(DATETIME_FORMAT_IN_FILE_NAMES)
                ));

            backup_repository
                .create_backup(&path.to_string_lossy())
                .await
                .unwrap();

            if oldest_backup_path.is_none() {
                oldest_backup_path = Some(path);
            }
        }

        // Act

        service.ensure_backup().await.unwrap();

        // Assert

        assert!(!oldest_backup_path.unwrap().exists());
    }

    #[tokio::test]
    pub async fn ensure_backup_other_files_than_backup_did_not_count_them_as_backups() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let backup_repository = scope.resolve::<dyn BackupRepository>().await;
        let settings_repository = scope.resolve::<dyn SettingsRepository>().await;
        let settings = settings_repository.get_settings().await;
        let service = scope.resolve::<BackupService>().await;

        let mut oldest_backup_path = None;

        for i in 0..MAX_NUMBER_OF_BACKUPS - 1 {
            let path = settings
                .database_location()
                .database_directory()
                .join(format!(
                    "{}.backup",
                    Utc.with_ymd_and_hms(2000, 1, 1, 0, 0, i as u32)
                        .unwrap()
                        .format(DATETIME_FORMAT_IN_FILE_NAMES)
                ));

            backup_repository
                .create_backup(&path.to_string_lossy())
                .await
                .unwrap();

            if oldest_backup_path.is_none() {
                oldest_backup_path = Some(path);
            }
        }

        fs::write(
            settings
                .database_location()
                .database_directory()
                .join("settings.json"),
            "1234",
        )
        .await
        .unwrap();
        fs::write(
            settings
                .database_location()
                .database_directory()
                .join("test.backup"),
            "1234",
        )
        .await
        .unwrap();

        // Act

        service.ensure_backup().await.unwrap();

        // Assert

        assert!(oldest_backup_path.unwrap().exists());
    }
}
