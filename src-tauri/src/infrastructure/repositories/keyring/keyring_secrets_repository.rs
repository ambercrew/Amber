use keyring::Entry;

use crate::secrets::repositories::secrets_repository::{SecretsRepository, SecretsRepositoryError};

pub struct KeyringSecretsRepository {
    service: String,
}

impl KeyringSecretsRepository {
    pub fn new(service: impl Into<String>) -> Self {
        Self {
            service: service.into(),
        }
    }
}

impl SecretsRepository for KeyringSecretsRepository {
    fn get_secret(&self, key: &str) -> Option<String> {
        Entry::new(&self.service, key)
            .ok()
            .and_then(|entry| entry.get_password().ok())
    }

    fn set_secret(&self, key: &str, value: &str) -> Result<(), SecretsRepositoryError> {
        let entry = Entry::new(&self.service, key)
            .map_err(|e| SecretsRepositoryError::CannotSave(Box::new(e)))?;
        entry
            .set_password(value)
            .map_err(|e| SecretsRepositoryError::CannotSave(Box::new(e)))
    }
}
