use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    common::repository_error::RepositoryError,
    file_system::{
        entities::folder::Folder, repositories::folder_repository::FolderRepository,
        value_objects::file_system_item_name::FileSystemItemName,
    },
    infrastructure::{
        repositories::sqlite::sqlite_rows::folder_row::FolderRow,
        value_objects::db_transaction::DbTransaction,
    },
};

#[derive(ScopeInjectable)]
pub struct SqliteFolderRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl FolderRepository for SqliteFolderRepository {
    async fn get_by_id(&self, id: Guid) -> Result<Folder, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            FolderRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                parent_id as "parent_id: _",
                fsrs_profile_id as "fsrs_profile_id: _",
                name
            FROM folders
            WHERE id = $1"#,
            id
        )
        .fetch_one(&mut *tx)
        .await;

        Ok(row?.into())
    }

    async fn get_all_folders(&self) -> Result<Vec<Folder>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            FolderRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                parent_id as "parent_id: _",
                fsrs_profile_id as "fsrs_profile_id: _",
                name
            FROM folders"#,
        )
        .fetch_all(&mut *tx)
        .await;

        Ok(rows?.into_iter().map(|row| row.into()).collect())
    }

    async fn get_subfolders(&self, parent_folder_id: Guid) -> Result<Vec<Folder>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            FolderRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                parent_id as "parent_id: _",
                fsrs_profile_id as "fsrs_profile_id: _",
                name
            FROM folders
            WHERE parent_id = $1"#,
            parent_folder_id
        )
        .fetch_all(&mut *tx)
        .await;

        Ok(rows?.into_iter().map(|row| row.into()).collect())
    }

    async fn get_all_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Folder>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            FolderRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                parent_id as "parent_id: _",
                fsrs_profile_id as "fsrs_profile_id: _",
                name
            FROM folders
            WHERE modified_date >= datetime($1)"#,
            modified_date
        )
        .fetch_all(&mut *tx)
        .await;

        Ok(rows?.into_iter().map(|row| row.into()).collect())
    }

    async fn exists(
        &self,
        parent_id: Option<Guid>,
        name: &FileSystemItemName,
    ) -> Result<bool, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let name_string = name.to_string();
        let row = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM folders WHERE parent_id = $1 AND name = $2"#,
            parent_id,
            name_string
        )
        .fetch_one(&mut *tx)
        .await;

        Ok(row? > 0)
    }

    async fn create(&self, folder: &Folder) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let folder_id = folder.id();
        let folder_name = folder.name().to_string();
        let parent_id = folder.parent_id();
        let created_date = folder.created_date();
        let modified_date = folder.modified_date();
        let fsrs_profile_choice = Option::<Guid>::from(folder.fsrs_profile_choice());

        let result = sqlx::query!(
            "INSERT INTO folders(
                id,
                created_date,
                modified_date,
                name,
                parent_id,
                fsrs_profile_id)
            VALUES ($1, datetime($2), datetime($3), $4, $5, $6)",
            folder_id,
            created_date,
            modified_date,
            folder_name,
            parent_id,
            fsrs_profile_choice
        )
        .execute(&mut *tx)
        .await;

        result?;
        Ok(())
    }

    async fn update(&self, folder: &Folder) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let folder_id = folder.id();
        let folder_name = folder.name().to_string();
        let parent_id = folder.parent_id();
        let created_date = folder.created_date();
        let modified_date = folder.modified_date();
        let fsrs_profile_choice = Option::<Guid>::from(folder.fsrs_profile_choice());

        let result = sqlx::query!(
            "UPDATE folders SET
                id = $1,
                created_date = datetime($2),
                modified_date = datetime($3),
                name = $4,
                parent_id = $5,
                fsrs_profile_id = $6
            WHERE id = $1",
            folder_id,
            created_date,
            modified_date,
            folder_name,
            parent_id,
            fsrs_profile_choice
        )
        .execute(&mut *tx)
        .await;

        result?;
        Ok(())
    }

    async fn upsert_with_modified_date_if_modified_before(
        &self,
        folder: &Folder,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let folder_id = folder.id();
        let folder_name = folder.name().to_string();
        let parent_id = folder.parent_id();
        let created_date = folder.created_date();
        let fsrs_profile_choice = Option::<Guid>::from(folder.fsrs_profile_choice());

        let result = sqlx::query!(
            r#"INSERT INTO folders(
                id,
                name,
                parent_id,
                modified_date,
                created_date,
                fsrs_profile_id)
            VALUES ($1, $2, $3, datetime($4), datetime($5), $6)
            ON CONFLICT(id) DO UPDATE
            SET id = $1,
                name = $2,
                parent_id = $3,
                modified_date = datetime($4),
                created_date = datetime($5),
                fsrs_profile_id = $6
            WHERE modified_date <= datetime($4)
            "#,
            folder_id,
            folder_name,
            parent_id,
            modified_date,
            created_date,
            fsrs_profile_choice
        )
        .execute(&mut *tx)
        .await;

        Ok(result?.rows_affected())
    }

    async fn delete_by_id(&self, id: Guid) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let result = sqlx::query!("DELETE FROM folders WHERE id = $1", id)
            .execute(&mut *tx)
            .await;

        result?;
        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        file_system::{
            entities::file::File, repositories::file_repository::FileRepository,
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::sqlite_file_repository::SqliteFileRepository,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        injector
    }

    #[tokio::test]
    pub async fn get_all_folders_valid_input_returned_all_files() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let repository = scope.resolve::<dyn FolderRepository>().await;

        repository
            .create(&Folder::new_unchecked(
                Guid::new_v4(),
                Utc::now(),
                Utc::now(),
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = repository.get_all_folders().await.unwrap();

        // Assert

        assert_eq!(2, actual.len());
        assert!(
            actual
                .iter()
                .any(|f| f.name() == FileSystemItemName::new_unchecked("folder".to_string()))
        );
    }

    #[tokio::test]
    pub async fn delete_by_id_valid_input_deleted_recursively() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let repository = scope.resolve::<dyn FolderRepository>().await;

        let parent_id = Guid::new_v4();
        repository
            .create(&Folder::new_unchecked(
                parent_id,
                Utc::now(),
                Utc::now(),
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        repository
            .create(&Folder::new_unchecked(
                Guid::new_v4(),
                Utc::now(),
                Utc::now(),
                Some(parent_id),
                "sub folder".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();
        scope
            .resolve::<dyn FileRepository>()
            .await
            .create(&File::new_unchecked(
                Guid::new_v4(),
                Utc::now(),
                Utc::now(),
                Some(parent_id),
                "file".try_into().unwrap(),
                FsrsProfileChoice::Inherit,
            ))
            .await
            .unwrap();

        scope.save_changes().await.unwrap();

        // Act

        repository.delete_by_id(parent_id).await.unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual = repository.get_all_folders().await.unwrap();
        // Only root should exist!
        assert_eq!(1, actual.len());
    }
}
