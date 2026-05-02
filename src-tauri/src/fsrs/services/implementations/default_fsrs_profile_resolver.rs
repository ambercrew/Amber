use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    file_system::{
        repositories::folder_repository::FolderRepository,
        value_objects::fsrs_profile_choice::FsrsProfileChoice,
    },
    fsrs::{
        entities::fsrs_profile::FsrsProfile,
        repositories::fsrs_repository::FsrsRepository,
        services::fsrs_profile_resolver::{FsrsProfileResolver, FsrsProfileResolverError},
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultFsrsProfileResolver {
    folder_repository: Arc<dyn FolderRepository>,
    fsrs_repository: Arc<dyn FsrsRepository>,
}

#[async_trait]
impl FsrsProfileResolver for DefaultFsrsProfileResolver {
    async fn get_for_item(
        &self,
        mut fsrs_profile_choice: FsrsProfileChoice,
        mut parent_id: Option<Guid>,
    ) -> Result<FsrsProfile, FsrsProfileResolverError> {
        while FsrsProfileChoice::Inherit == fsrs_profile_choice {
            let parent = self.folder_repository.get_by_id(parent_id.unwrap()).await?;
            fsrs_profile_choice = parent.fsrs_profile_choice();
            parent_id = parent.parent_id();
        }

        if let FsrsProfileChoice::Id(id) = fsrs_profile_choice {
            let result = self.fsrs_repository.get_by_id(id).await?;
            return Ok(result);
        }

        unreachable!()
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        DEFAULT_FSRS_PROFILE_ID, Guid, ROOT_FOLDER_ID,
        file_system::{
            entities::{file::File, folder::Folder},
            repositories::{file_repository::FileRepository, folder_repository::FolderRepository},
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        fsrs::{
            entities::fsrs_profile::FsrsProfile, repositories::fsrs_repository::FsrsRepository,
            services::fsrs_profile_resolver::FsrsProfileResolver,
        },
        infrastructure::repositories::sqlite::{
            sqlite_file_repository::SqliteFileRepository,
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_fsrs_repository::SqliteFsrsRepository,
        },
        test_utils::create_test_injector,
    };
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};

    use super::DefaultFsrsProfileResolver;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, dyn FsrsRepository, SqliteFsrsRepository);
        register_scope!(
            injector,
            dyn FsrsProfileResolver,
            DefaultFsrsProfileResolver
        );
        injector
    }

    #[tokio::test]
    pub async fn get_fsrs_profile_recursively_for_item_nested_file_returns_profile_correctly() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;

        let parent = Folder::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        folder_repository.create(&parent).await.unwrap();

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(parent.id()),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        // Act

        let result = scope
            .resolve::<dyn FsrsProfileResolver>()
            .await
            .get_for_item(file.fsrs_profile_choice(), file.parent_id())
            .await
            .unwrap();

        // Assert

        assert_eq!(result.id(), DEFAULT_FSRS_PROFILE_ID);
    }

    #[tokio::test]
    pub async fn get_fsrs_profile_recursively_for_item_file_with_custom_profile_returned_profile() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let fsrs_repository = scope.resolve::<dyn FsrsRepository>().await;

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

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Id(profile.id()),
        );
        file_repository.create(&file).await.unwrap();

        // Act

        let result = scope
            .resolve::<dyn FsrsProfileResolver>()
            .await
            .get_for_item(file.fsrs_profile_choice(), file.parent_id())
            .await
            .unwrap();

        // Assert

        assert_eq!(result.id(), profile.id());
    }
}
