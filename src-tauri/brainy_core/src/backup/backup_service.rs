use std::{path::PathBuf, sync::Arc};

use chrono::{DateTime, Duration, NaiveDateTime, TimeZone, Utc};
use thiserror::Error;
use tokio::fs;

use crate::{
    backup::repositories::traits::backup_repository::BackupRepository,
    common::repository_error::RepositoryError,
    local_configurations::{
        entities::LocalConfiguration,
        repositories::traits::local_configuration_repository::LocalConfigurationRepository,
    },
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum BackupServiceError {
    #[error("{0}")]
    UnknownRepositoryError(#[from] RepositoryError),
    #[error("The application is not able to list the entries in the settings folder!")]
    CannotListEntriesInFolder(String),
}

pub const TIME_BETWEEN_BACKUPS_IN_MINUTES: u64 = 120;
const LAST_BACKUP_DATE_CONFIGURATION_NAME: &str = "LAST_SYNC_DATE";
const MAX_NUMBER_OF_BACKUPS: usize = 8;
const DATETIME_FORMAT_IN_FILE_NAMES: &str = "%Y_%m_%d_%H_%M_%S";

pub struct BackupService {
    local_configuration_repository: Arc<dyn LocalConfigurationRepository>,
    backup_repository: Arc<dyn BackupRepository>,
    backup_directory: PathBuf,
}

impl BackupService {
    pub fn new(
        local_configuration_repository: Arc<dyn LocalConfigurationRepository>,
        backup_repository: Arc<dyn BackupRepository>,
        directory: PathBuf,
    ) -> Self {
        Self {
            local_configuration_repository,
            backup_repository,
            backup_directory: directory,
        }
    }

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
        let backup_path = self.backup_directory.join(backup_name);
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

        let mut entries = match fs::read_dir(&self.backup_directory).await {
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

        if current_backups.len() >= MAX_NUMBER_OF_BACKUPS {
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

// TODO:
#[cfg(test)]
pub mod tests {}
