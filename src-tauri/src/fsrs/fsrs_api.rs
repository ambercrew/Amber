use std::sync::Arc;

use crate::{
    Guid,
    common::{
        api_error::ApiError, repository_error::RepositoryError, unit_of_work_ext::UnitOfWorkExt,
    },
    file_system::{
        repositories::traits::{
            file_repository::FileRepository, folder_repository::FolderRepository,
        },
        value_objects::fsrs_profile_choice::FsrsProfileChoice,
    },
    fsrs::{
        entities::{
            fsrs_profile::FsrsProfile, repositories::traits::fsrs_repository::FsrsRepository,
        },
        fsrs_service::FsrsService,
    },
};
use injector::{injector::Injector, injector_scope::InjectorScope};
use tauri::State;

#[tauri::command]
pub async fn get_all_fsrs_profiles(
    injector: State<'_, Arc<Injector>>,
) -> Result<Vec<FsrsProfile>, ApiError> {
    let scope = injector.start_scope();
    let result = scope
        .resolve::<dyn FsrsRepository>()
        .await
        .get_all_fsrs_profiles()
        .await?;
    Ok(result)
}

#[tauri::command]
pub async fn get_file_fsrs_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let file = scope
        .resolve::<dyn FileRepository>()
        .await
        .get_by_id(id)
        .await?;

    let result =
        get_fsrs_profile_recursively_for_item(&scope, file.fsrs_profile_choice(), file.parent_id())
            .await?;
    Ok(result)
}

#[tauri::command]
pub async fn get_folder_fsrs_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let folder = scope
        .resolve::<dyn FolderRepository>()
        .await
        .get_by_id(id)
        .await?;

    let result = get_fsrs_profile_recursively_for_item(
        &scope,
        folder.fsrs_profile_choice(),
        folder.parent_id(),
    )
    .await?;
    Ok(result)
}

#[tauri::command]
pub async fn get_fsrs_profile_choice_for_folder(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfileChoice, ApiError> {
    let scope = injector.start_scope();
    let folder = scope
        .resolve::<dyn FolderRepository>()
        .await
        .get_by_id(id)
        .await?;
    Ok(folder.fsrs_profile_choice())
}

#[tauri::command]
pub async fn get_fsrs_profile_choice_for_file(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfileChoice, ApiError> {
    let scope = injector.start_scope();
    let file = scope
        .resolve::<dyn FileRepository>()
        .await
        .get_by_id(id)
        .await?;
    Ok(file.fsrs_profile_choice())
}

#[tauri::command]
pub async fn get_parent_fsrs_profile_for_folder(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let folder_repository = scope.resolve::<dyn FolderRepository>().await;

    let folder = folder_repository.get_by_id(id).await?;
    let parent = folder_repository
        .get_by_id(folder.parent_id().unwrap())
        .await?;
    let result = get_fsrs_profile_recursively_for_item(
        &scope,
        parent.fsrs_profile_choice(),
        parent.parent_id(),
    )
    .await?;
    Ok(result)
}

#[tauri::command]
pub async fn get_parent_fsrs_profile_for_file(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let file = scope
        .resolve::<dyn FileRepository>()
        .await
        .get_by_id(id)
        .await?;
    let parent = scope
        .resolve::<dyn FolderRepository>()
        .await
        .get_by_id(file.parent_id().unwrap())
        .await?;
    let result = get_fsrs_profile_recursively_for_item(
        &scope,
        parent.fsrs_profile_choice(),
        parent.parent_id(),
    )
    .await?;
    Ok(result)
}

async fn get_fsrs_profile_recursively_for_item(
    scope: &InjectorScope<'_>,
    mut fsrs_profile_choice: FsrsProfileChoice,
    mut parent_id: Option<Guid>,
) -> Result<FsrsProfile, RepositoryError> {
    let folder_repository = scope.resolve::<dyn FolderRepository>().await;
    let fsrs_repository = scope.resolve::<dyn FsrsRepository>().await;

    while FsrsProfileChoice::Inherit == fsrs_profile_choice {
        let parent = folder_repository.get_by_id(parent_id.unwrap()).await?;
        fsrs_profile_choice = parent.fsrs_profile_choice();
        parent_id = parent.parent_id();
    }

    if let FsrsProfileChoice::Id(id) = fsrs_profile_choice {
        let result = fsrs_repository.get_by_id(id).await?;
        return Ok(result);
    }

    unreachable!()
}

#[tauri::command]
pub async fn create_profile(
    injector: State<'_, Arc<Injector>>,
    name: String,
    request_retention: f64,
    maximum_interval: f64,
    weights: Vec<f64>,
) -> Result<FsrsProfile, ApiError> {
    let scope = injector.start_scope();
    let profile = FsrsProfile::new(None, name, request_retention, maximum_interval, weights)?;
    scope
        .resolve::<dyn FsrsRepository>()
        .await
        .create(&profile)
        .await?;
    scope.save_changes().await?;
    Ok(profile)
}

#[tauri::command]
pub async fn update_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
    name: String,
    request_retention: f64,
    maximum_interval: f64,
    weights: Vec<f64>,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let fsrs_repository = scope.resolve::<dyn FsrsRepository>().await;

    let mut profile = fsrs_repository.get_by_id(id).await?;
    profile.set_name(name);
    profile.set_request_retention(request_retention);
    profile.set_maximum_interval(maximum_interval);
    profile.set_weights(weights);

    fsrs_repository.update(&profile).await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn set_fsrs_profile_choice_for_folder(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
    fsrs_profile_choice: FsrsProfileChoice,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let folder_repository = scope.resolve::<dyn FolderRepository>().await;

    let mut folder = folder_repository.get_by_id(id).await?;
    folder.set_fsrs_profile_choice(fsrs_profile_choice);
    folder_repository.update(&folder).await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn set_fsrs_profile_choice_for_file(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
    fsrs_profile_choice: FsrsProfileChoice,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    let file_repository = scope.resolve::<dyn FileRepository>().await;

    let mut file = file_repository.get_by_id(id).await?;
    file.set_fsrs_profile_choice(fsrs_profile_choice);
    file_repository.update(&file).await?;
    scope.save_changes().await?;
    Ok(())
}

#[tauri::command]
pub async fn delete_fsrs_profile(
    injector: State<'_, Arc<Injector>>,
    id: Guid,
) -> Result<(), ApiError> {
    let scope = injector.start_scope();
    scope
        .resolve::<FsrsService>()
        .await
        .delete_by_id(id)
        .await?;
    scope.save_changes().await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        DEFAULT_FSRS_PROFILE_ID, ROOT_FOLDER_ID,
        file_system::{
            entities::{file::File, folder::Folder},
            repositories::{
                sqlite_file_repository::SqliteFileRepository,
                sqlite_folder_repository::SqliteFolderRepository,
            },
        },
        fsrs::entities::repositories::sqlite_fsrs_repository::SqliteFsrsRepository,
        test_utils::create_test_injector,
    };
    use chrono::Utc;
    use injector::register_scope;

    async fn get_test_dependencies() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(injector, dyn FsrsRepository, SqliteFsrsRepository);
        injector
    }

    #[tokio::test]
    pub async fn get_fsrs_profile_recursively_for_item_nested_file_returns_profile_correctly() {
        // Arrange

        let injector = get_test_dependencies().await;
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

        let result = get_fsrs_profile_recursively_for_item(
            &scope,
            file.fsrs_profile_choice(),
            file.parent_id(),
        )
        .await
        .unwrap();

        // Assert

        assert_eq!(result.id(), DEFAULT_FSRS_PROFILE_ID);
    }

    #[tokio::test]
    pub async fn get_fsrs_profile_recursively_for_item_file_with_custom_profile_returned_profile() {
        // Arrange

        let injector = get_test_dependencies().await;
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

        let result = get_fsrs_profile_recursively_for_item(
            &scope,
            file.fsrs_profile_choice(),
            file.parent_id(),
        )
        .await
        .unwrap();

        // Assert

        assert_eq!(result.id(), profile.id());
    }
}
