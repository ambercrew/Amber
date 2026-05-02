use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid, ROOT_FOLDER_ID,
    file_system::{
        repositories::folder_repository::FolderRepository,
        value_objects::fsrs_profile_choice::FsrsProfileChoice,
    },
    fsrs::{
        repositories::fsrs_repository::{DeleteFsrsRequest, FsrsRepository},
        services::fsrs_profile_deleter::{FsrsProfileDeleter, FsrsProfileDeleterError},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultFsrsProfileDeleter {
    folder_repository: Arc<dyn FolderRepository>,
    fsrs_repository: Arc<dyn FsrsRepository>,
}

#[async_trait]
impl FsrsProfileDeleter for DefaultFsrsProfileDeleter {
    async fn delete_by_id(&self, id: Guid) -> Result<(), FsrsProfileDeleterError> {
        let mut root = self.folder_repository.get_by_id(ROOT_FOLDER_ID).await?;

        let all_profiles = self.fsrs_repository.get_all_fsrs_profiles().await?;

        if all_profiles.len() == 1 {
            return Err(FsrsProfileDeleterError::CannotDeleteLastProfile);
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
    use injector::{injector::Injector, register_scope};

    use super::*;
    use crate::{
        DEFAULT_FSRS_PROFILE_ID,
        file_system::repositories::folder_repository::FolderRepository,
        fsrs::{
            entities::fsrs_profile::FsrsProfile,
            repositories::fsrs_repository::FsrsRepository,
            services::fsrs_profile_deleter::{FsrsProfileDeleter, FsrsProfileDeleterError},
        },
        infrastructure::repositories::sqlite::{
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_fsrs_repository::SqliteFsrsRepository,
        },
        test_utils::create_test_injector,
    };

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn FsrsRepository, SqliteFsrsRepository);
        register_scope!(injector, DefaultFsrsProfileDeleter);
        injector
    }

    #[tokio::test]
    pub async fn delete_by_id_only_one_profile_returned_error() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<DefaultFsrsProfileDeleter>().await;

        // Act

        let result = service.delete_by_id(DEFAULT_FSRS_PROFILE_ID).await;

        // Assert

        assert_eq!(
            result,
            Err(FsrsProfileDeleterError::CannotDeleteLastProfile)
        );
    }

    #[tokio::test]
    pub async fn delete_by_id_delete_root_profile_updated_root_profile_and_delete_profile() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let fsrs_repository = scope.resolve::<dyn FsrsRepository>().await;
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let service = scope.resolve::<DefaultFsrsProfileDeleter>().await;

        let profile = FsrsProfile::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            "test".into(),
            1f64,
            1f64,
            vec![1f64],
        );
        fsrs_repository.create(&profile).await.unwrap();

        // Act

        service.delete_by_id(DEFAULT_FSRS_PROFILE_ID).await.unwrap();

        // Assert

        let root = folder_repository.get_by_id(ROOT_FOLDER_ID).await.unwrap();
        assert_eq!(
            root.fsrs_profile_choice().clone(),
            FsrsProfileChoice::Id(profile.id())
        );

        let all_profiles = fsrs_repository.get_all_fsrs_profiles().await.unwrap();
        assert_eq!(1, all_profiles.len());
    }
}
