use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{Sqlite, SqlitePool, Transaction};
use tokio::sync::Mutex;

use crate::{
    Guid,
    common::repository_error::RepositoryError,
    file_system::{
        entities::folder::Folder,
        repositories::{
            sqlite_folder_repository::folder_row::FolderRow,
            traits::folder_repository::FolderRepository,
        },
        value_objects::file_system_item_name::FileSystemItemName,
    },
};

pub struct SqliteFolderRepository {
    pool: Arc<SqlitePool>,
    tx: Arc<Mutex<Transaction<'static, Sqlite>>>,
}

impl SqliteFolderRepository {
    pub fn new(pool: Arc<SqlitePool>, tx: Arc<Mutex<Transaction<'static, Sqlite>>>) -> Self {
        Self { pool, tx }
    }
}

#[async_trait]
impl FolderRepository for SqliteFolderRepository {
    async fn get_by_id(&self, id: Guid) -> Result<Folder, RepositoryError> {
        let row = sqlx::query_as!(
            FolderRow,
            r#"SELECT id as "id: _", parent_id as "parent_id: _", name FROM folders WHERE id = $1"#,
            id
        )
        .fetch_one(&*self.pool)
        .await;

        match row {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(row) => Ok(row.into()),
        }
    }

    async fn get_all_folders(&self) -> Result<Vec<Folder>, RepositoryError> {
        let rows = sqlx::query_as!(
            FolderRow,
            r#"SELECT id as "id: _", parent_id as "parent_id: _", name FROM folders"#,
        )
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => Ok(rows.into_iter().map(|row| row.into()).collect()),
        }
    }

    async fn get_subfolders(&self, parent_folder_id: Guid) -> Result<Vec<Folder>, RepositoryError> {
        let rows = sqlx::query_as!(
            FolderRow,
            r#"SELECT id as "id: _", parent_id as "parent_id: _", name FROM folders WHERE parent_id = $1"#, parent_folder_id
        )
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => Ok(rows.into_iter().map(|row| row.into()).collect()),
        }
    }

    async fn exists(
        &self,
        parent_id: Option<Guid>,
        name: &FileSystemItemName,
    ) -> Result<bool, RepositoryError> {
        let name_string = name.to_string();
        let row = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM folders WHERE parent_id = $1 AND name = $2"#,
            parent_id,
            name_string
        )
        .fetch_one(&*self.pool)
        .await;

        match row {
            Ok(cnt) => Ok(cnt > 0),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn create(&self, folder: &Folder) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let folder_id = folder.id();
        let folder_name = folder.name().to_string();
        let parent_id = folder.parent_id();
        let result = sqlx::query!(
            "INSERT INTO folders(id, name, parent_id) VALUES ($1, $2, $3)",
            folder_id,
            folder_name,
            parent_id
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn update(&self, folder: &Folder) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let folder_id = folder.id();
        let folder_name = folder.name().to_string();
        let parent_id = folder.parent_id();
        let result = sqlx::query!(
            "UPDATE folders SET id = $1, name = $2, parent_id = $3 WHERE id = $1",
            folder_id,
            folder_name,
            parent_id
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn delete_by_id(&self, id: Guid) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let result = sqlx::query!("DELETE FROM folders WHERE id = $1", id)
            .execute(&mut *tx)
            .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn upsert_with_modified_date_if_modified_before(
        &self,
        folder: &Folder,
        modified_date: DateTime<Utc>) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let folder_id = folder.id();
        let folder_name = folder.name().to_string();
        let parent_id = folder.parent_id();
        let result = sqlx::query!(
            r#"INSERT INTO folders(id, name, parent_id, modified_date) VALUES ($1, $2, $3, $4)
            ON CONFLICT(id) DO UPDATE
            SET id = $1, name = $2, parent_id = $3, modified_date = datetime($4)
            WHERE modified_date <= datetime($4)
            "#,
            folder_id,
            folder_name,
            parent_id,
            modified_date
        )
        .execute(&mut *tx)
        .await;

        if let Err(err) = result {
            return Err(RepositoryError::UnknownError(err.to_string()));
        }

        Ok(())
    }
}

mod folder_row {
    use super::*;

    pub(super) struct FolderRow {
        pub id: Guid,
        pub parent_id: Option<Guid>,
        pub name: String,
    }

    impl From<FolderRow> for Folder {
        fn from(value: FolderRow) -> Self {
            Folder::new(
                Some(value.id),
                value.parent_id,
                FileSystemItemName::new_unchecked(value.name),
            )
        }
    }
}

#[cfg(test)]
pub mod tests {
    use crate::{
        ROOT_FOLDER_ID,
        common::{
            sqlite_repositories_context::SqliteRepositoriesContext,
            traits::repositories_context::RepositoriesContext,
        },
        file_system::entities::file::File,
    };

    use super::*;

    #[tokio::test]
    pub async fn get_all_folders_valid_input_returned_all_files() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        context
            .folder_repository()
            .create(&Folder::new(
                None,
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = context.folder_repository().get_all_folders().await.unwrap();

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

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let parent_id = Guid::new_v4();
        context
            .folder_repository()
            .create(&Folder::new(
                Some(parent_id),
                Some(ROOT_FOLDER_ID),
                "folder".try_into().unwrap(),
            ))
            .await
            .unwrap();
        context
            .folder_repository()
            .create(&Folder::new(
                None,
                Some(parent_id),
                "sub folder".try_into().unwrap(),
            ))
            .await
            .unwrap();
        context
            .file_repository()
            .create(&File::new(
                None,
                Some(parent_id),
                "file".try_into().unwrap(),
            ))
            .await
            .unwrap();

        context.save_changes().await.unwrap();

        // Act

        context
            .folder_repository()
            .delete_by_id(parent_id)
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let actual = context.folder_repository().get_all_folders().await.unwrap();
        // Only root should exist!
        assert_eq!(1, actual.len());
    }
}
