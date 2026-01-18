use std::sync::Arc;

use thiserror::Error;

use crate::{
    Guid, ROOT_FOLDER_ID,
    common::repository_error::RepositoryError,
    file_system::{
        repositories::traits::folder_repository::FolderRepository,
        value_objects::fsrs_profile_choice::FsrsProfileChoice,
    },
    fsrs::entities::repositories::traits::fsrs_repository::{DeleteFsrsRequest, FsrsRepository},
};

#[derive(Error, Debug, PartialEq, Eq)]
pub enum FsrsServiceError {
    #[error("{0}")]
    UnknownRepositoryError(#[from] RepositoryError),

    #[error(
        "You cannot delete the last profile, please create another one before deleting the current one"
    )]
    CannotDeleteLastProfile,
}

pub struct FsrsService {
    folder_repository: Arc<dyn FolderRepository>,
    fsrs_repository: Arc<dyn FsrsRepository>,
}

impl FsrsService {
    pub fn new(
        folder_repository: Arc<dyn FolderRepository>,
        fsrs_repository: Arc<dyn FsrsRepository>,
    ) -> Self {
        Self {
            folder_repository,
            fsrs_repository,
        }
    }

    pub async fn delete_by_id(&self, id: Guid) -> Result<(), FsrsServiceError> {
        let mut root = self.folder_repository.get_by_id(ROOT_FOLDER_ID).await?;

        let all_profiles = self.fsrs_repository.get_all_fsrs_profiles().await?;

        if all_profiles.len() == 1 {
            return Err(FsrsServiceError::CannotDeleteLastProfile);
        }

        if let FsrsProfileChoice::Id(root_profile_id) = root.fsrs_profile_choice()
            && id == root_profile_id
        {
            let new_profile = all_profiles.iter().find(|item| item.id() != id).unwrap();
            root.set_fsrs_profile_choice(FsrsProfileChoice::Id(new_profile.id()));
            self.folder_repository.update(&root).await?;
        }

        self.fsrs_repository
            .delete_by_id(DeleteFsrsRequest::new(id))
            .await?;

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use chrono::Utc;

    use crate::{
        DEFAULT_FSRS_PROFILE_ID,
        common::{
            sqlite_repositories_context::SqliteRepositoriesContext,
            traits::repositories_context::RepositoriesContext,
        },
        fsrs::entities::fsrs_profile::FsrsProfile,
    };

    use super::*;

    async fn create_test_dependencies() -> (SqliteRepositoriesContext, FsrsService) {
        let context = SqliteRepositoriesContext::create_testing_context().await;
        let service = FsrsService::new(context.folder_repository(), context.fsrs_repository());

        (context, service)
    }

    #[tokio::test]
    pub async fn delete_by_id_only_one_profile_returned_error() {
        // Arrange

        let (_, service) = create_test_dependencies().await;

        // Act

        let result = service.delete_by_id(DEFAULT_FSRS_PROFILE_ID).await;

        // Assert

        assert_eq!(result, Err(FsrsServiceError::CannotDeleteLastProfile));
    }

    #[tokio::test]
    pub async fn delete_by_id_delete_root_profile_updated_root_profile_and_delete_profile() {
        // Arrange

        let (context, service) = create_test_dependencies().await;

        let profile = FsrsProfile::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            "test".into(),
            1f64,
            1f64,
            vec![1f64],
        );
        context.fsrs_repository().create(&profile).await.unwrap();

        // Act

        service.delete_by_id(DEFAULT_FSRS_PROFILE_ID).await.unwrap();

        // Assert

        let root = context
            .folder_repository()
            .get_by_id(ROOT_FOLDER_ID)
            .await
            .unwrap();
        assert_eq!(
            root.fsrs_profile_choice().clone(),
            FsrsProfileChoice::Id(profile.id())
        );

        let all_profiles = context
            .fsrs_repository()
            .get_all_fsrs_profiles()
            .await
            .unwrap();
        assert_eq!(1, all_profiles.len());
    }
}
