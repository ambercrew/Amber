use std::sync::Arc;

use crate::settings::value_objects::database_location::{
    DatabaseLocation, DatabaseLocationProfile,
};
use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use tokio::{
    fs::{self},
    io::AsyncReadExt,
    sync::Mutex,
};

use crate::{
    infrastructure::value_objects::app_data_directory::AppDataDirectory,
    settings::{
        entities::settings::Settings,
        repositories::settings_repository::{SettingsRepository, SettingsRepositoryError},
    },
};

#[cfg(not(debug_assertions))]
const SETTINGS_FILE_NAME: &str = "settings.json";
#[cfg(debug_assertions)]
const SETTINGS_FILE_NAME: &str = "settings.dev.json";

#[derive(ScopeInjectable)]
pub struct DiskSettingsRepository {
    settings: Arc<Mutex<Settings>>,
    app_data_directory: Arc<AppDataDirectory>,
}

impl DiskSettingsRepository {
    pub async fn init_settings_and_get(
        app_data_directory: &AppDataDirectory,
    ) -> Result<Settings, SettingsRepositoryError> {
        if app_data_directory
            .get_path()
            .join(SETTINGS_FILE_NAME)
            .exists()
        {
            read_settings_from_file(app_data_directory).await
        } else {
            // TODO: contains domain logic, should not be here!
            let database_location = DatabaseLocation::new(
                app_data_directory.get_path().clone(),
                DatabaseLocationProfile::Default,
            )?;

            let settings = Settings::new(database_location);
            save_to_disk_inner(&settings, app_data_directory).await?;
            Ok(settings)
        }
    }
}

async fn read_settings_from_file(
    app_data_directory: &AppDataDirectory,
) -> Result<Settings, SettingsRepositoryError> {
    use tokio::fs::File;

    let settings_path = app_data_directory.get_path().join(SETTINGS_FILE_NAME);
    log::info!("Reading settings from '{SETTINGS_FILE_NAME}'.");
    let mut file = match File::open(settings_path).await {
        Err(err) => return Err(SettingsRepositoryError::ErrorOpeningFile(err.to_string())),
        Ok(file) => file,
    };
    let mut file_content = String::new();
    if let Err(err) = file.read_to_string(&mut file_content).await {
        return Err(SettingsRepositoryError::ErrorReadingFile(err.to_string()));
    }
    match serde_json::from_str(&file_content) {
        Ok(settings) => Ok(settings),
        Err(err) => Err(SettingsRepositoryError::ParsingError(err.to_string())),
    }
}

#[async_trait]
impl SettingsRepository for DiskSettingsRepository {
    async fn get_settings(&self) -> Settings {
        self.settings.lock().await.clone()
    }

    async fn save_settings(&self, settings: Settings) -> Result<(), SettingsRepositoryError> {
        let mut current_settings = self.settings.lock().await;
        save_to_disk_inner(&settings, &self.app_data_directory).await?;
        *current_settings = settings;
        Ok(())
    }
}

async fn save_to_disk_inner(
    settings: &Settings,
    app_data_directory: &AppDataDirectory,
) -> Result<(), SettingsRepositoryError> {
    let path = app_data_directory.get_path().join(SETTINGS_FILE_NAME);
    log::info!("Saving settings into '{}'.", path.to_str().unwrap());
    match fs::write(path, serde_json::to_string(settings).unwrap()).await {
        Ok(_) => Ok(()),
        Err(err) => Err(SettingsRepositoryError::SavingError(err.to_string())),
    }
}

#[cfg(test)]
pub mod tests {
    use tokio::fs::File;

    use crate::{settings::value_objects::theme::Theme, test_utils::create_temp_directory};

    use super::*;

    #[tokio::test]
    pub async fn init_settings_and_get_new_settings_created_and_saved_to_disk() {
        // Arrange

        let app_data_directory = AppDataDirectory::new(create_temp_directory().await);

        // Act

        DiskSettingsRepository::init_settings_and_get(&app_data_directory)
            .await
            .unwrap();

        // Assert

        assert!(
            app_data_directory
                .get_path()
                .join(SETTINGS_FILE_NAME)
                .exists()
        );

        let mut file_content = String::new();
        File::open(app_data_directory.get_path().join(SETTINGS_FILE_NAME))
            .await
            .unwrap()
            .read_to_string(&mut file_content)
            .await
            .unwrap();

        let settings = serde_json::from_str::<Settings>(&file_content).unwrap();
        assert_eq!(
            settings.database_location().get_path().clone(),
            app_data_directory.get_path().join("brainy.db")
        );
        assert_eq!(settings.theme, Theme::FollowSystem);
        assert_eq!(settings.zoom_percentage, 100f64);
        assert!(settings.auto_sync);
    }

    #[tokio::test]
    pub async fn init_settings_and_get_existing_setting_read_from_disk() {
        // Arrange

        let app_data_directory = AppDataDirectory::new(create_temp_directory().await);
        let mut settings = DiskSettingsRepository::init_settings_and_get(&app_data_directory)
            .await
            .unwrap();
        settings.zoom_percentage = 1f64;

        let settings_repository = DiskSettingsRepository {
            app_data_directory: Arc::new(app_data_directory.clone()),
            settings: Arc::new(Mutex::new(settings.clone())),
        };
        settings_repository.save_settings(settings).await.unwrap();

        // Act

        let actual = DiskSettingsRepository::init_settings_and_get(&app_data_directory)
            .await
            .unwrap();

        // Assert

        assert_eq!(actual.zoom_percentage, 1f64);
    }
}
