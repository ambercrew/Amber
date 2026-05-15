use std::{collections::HashMap, path::PathBuf};

use async_trait::async_trait;
use tokio::fs;

use crate::{
    infrastructure::value_objects::app_data_directory::AppDataDirectory,
    secrets::repositories::secrets_repository::{SecretsRepository, SecretsRepositoryError},
};

#[cfg(not(debug_assertions))]
const SECRETS_FILE_NAME: &str = ".secrets";
#[cfg(debug_assertions)]
const SECRETS_FILE_NAME: &str = ".dev.secrets";

pub struct DiskSecretsRepository {
    path: PathBuf,
}

impl DiskSecretsRepository {
    pub fn new(app_data_directory: &AppDataDirectory) -> Self {
        Self {
            path: app_data_directory.get_path().join(SECRETS_FILE_NAME),
        }
    }

    async fn read_all(&self) -> HashMap<String, String> {
        fs::read_to_string(&self.path)
            .await
            .ok()
            .and_then(|c| serde_json::from_str(&c).ok())
            .unwrap_or_default()
    }

    async fn write_all(&self, map: &HashMap<String, String>) -> Result<(), std::io::Error> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).await?;
        }
        fs::write(&self.path, serde_json::to_string(map).unwrap()).await
    }
}

#[async_trait]
impl SecretsRepository for DiskSecretsRepository {
    async fn get_secret(&self, key: &str) -> Option<String> {
        self.read_all().await.remove(key)
    }

    async fn set_secret(&self, key: &str, value: &str) -> Result<(), SecretsRepositoryError> {
        let mut map = self.read_all().await;
        map.insert(key.to_string(), value.to_string());
        self.write_all(&map)
            .await
            .map_err(|e| SecretsRepositoryError::CannotSave(Box::new(e)))
    }
}

#[cfg(test)]
mod tests {
    use crate::test_utils::create_temp_directory;

    use super::*;

    #[tokio::test]
    async fn set_secret_new_key_persisted_to_disk() {
        // Arrange

        let dir = AppDataDirectory::new(create_temp_directory().await);
        let repo = DiskSecretsRepository::new(&dir);

        // Act

        repo.set_secret("my-key", "my-value").await.unwrap();

        // Assert

        let repo2 = DiskSecretsRepository::new(&dir);
        assert_eq!(
            repo2.get_secret("my-key").await.as_deref(),
            Some("my-value")
        );
    }

    #[tokio::test]
    async fn set_secret_overwrite_existing_key_returns_new_value() {
        // Arrange

        let dir = AppDataDirectory::new(create_temp_directory().await);
        let repo = DiskSecretsRepository::new(&dir);
        repo.set_secret("key", "old").await.unwrap();

        // Act

        repo.set_secret("key", "new").await.unwrap();

        // Assert

        assert_eq!(repo.get_secret("key").await.as_deref(), Some("new"));
    }

    #[tokio::test]
    async fn get_secret_missing_key_returns_none() {
        // Arrange

        let dir = AppDataDirectory::new(create_temp_directory().await);
        let repo = DiskSecretsRepository::new(&dir);

        // Act

        let result = repo.get_secret("nonexistent").await;

        // Assert

        assert!(result.is_none());
    }
}
