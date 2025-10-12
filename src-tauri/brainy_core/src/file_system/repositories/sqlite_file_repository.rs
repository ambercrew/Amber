use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{Sqlite, SqlitePool, Transaction};
use tokio::sync::Mutex;

use crate::{
    Guid,
    common::repository_error::RepositoryError,
    file_system::{
        entities::file::File,
        repositories::{
            sqlite_file_repository::file_row::FileRow, traits::file_repository::FileRepository,
        },
        value_objects::file_system_item_name::FileSystemItemName,
    },
};

pub struct SqliteFileRepository {
    pool: Arc<SqlitePool>,
    tx: Arc<Mutex<Transaction<'static, Sqlite>>>,
}

impl SqliteFileRepository {
    pub fn new(pool: Arc<SqlitePool>, tx: Arc<Mutex<Transaction<'static, Sqlite>>>) -> Self {
        Self { pool, tx }
    }
}

#[async_trait]
impl FileRepository for SqliteFileRepository {
    async fn get_by_id(&self, id: Guid) -> Result<File, RepositoryError> {
        let row = sqlx::query_as!(
            FileRow,
            r#"SELECT id as "id: _", parent_id as "parent_id: _", name FROM files WHERE id = $1"#,
            id
        )
        .fetch_one(&*self.pool)
        .await;

        match row {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(row) => Ok(row.into()),
        }
    }

    async fn get_all_files(&self) -> Result<Vec<File>, RepositoryError> {
        let rows = sqlx::query_as!(
            FileRow,
            r#"SELECT id as "id: _", parent_id as "parent_id: _", name FROM files"#,
        )
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => Ok(rows.into_iter().map(|row| row.into()).collect()),
        }
    }

    async fn get_folder_files(&self, parent_folder_id: Guid) -> Result<Vec<File>, RepositoryError> {
        let rows = sqlx::query_as!(
            FileRow,
            r#"SELECT id as "id: _", parent_id as "parent_id: _", name FROM files WHERE parent_id = $1"#,
            parent_folder_id
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
            r#"SELECT COUNT(*) FROM files WHERE parent_id = $1 AND name = $2"#,
            parent_id,
            name_string
        )
        .bind(name.to_string())
        .fetch_one(&*self.pool)
        .await;

        match row {
            Ok(cnt) => Ok(cnt > 0),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn create(&self, file: &File) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let file_id = file.id();
        let file_name = file.name().to_string();
        let parent_id = file.parent_id();

        let result = sqlx::query!(
            "INSERT INTO files(id, name, parent_id) VALUES ($1, $2, $3)",
            file_id,
            file_name,
            parent_id
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn update(&self, file: &File) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let file_id = file.id();
        let file_name = file.name().to_string();
        let parent_id = file.parent_id();

        let result = sqlx::query!(
            "UPDATE files SET id = $1, name = $2, parent_id = $3 WHERE id = $1",
            file_id,
            file_name,
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

        let result = sqlx::query!("DELETE FROM files WHERE id = $1", id)
            .execute(&mut *tx)
            .await;

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn upsert_with_modified_date_if_modified_before(
        &self,
        file: &File,
        modified_date: DateTime<Utc>,
    ) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let file_id = file.id();
        let file_name = file.name().to_string();
        let parent_id = file.parent_id();
        let result = sqlx::query!(
            r#"INSERT INTO files(id, name, parent_id, modified_date) VALUES ($1, $2, $3, $4)
            ON CONFLICT(id) DO UPDATE
            SET id = $1, name = $2, parent_id = $3, modified_date = datetime($4)
            WHERE modified_date <= datetime($4)
            "#,
            file_id,
            file_name,
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
    pub async fn get_all_files_valid_input_returned_all_files() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        context
            .file_repository()
            .create(&File::new(
                None,
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = context.file_repository().get_all_files().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!(
            FileSystemItemName::new_unchecked("file".to_string()),
            actual[0].name()
        );
    }

    #[tokio::test]
    pub async fn delete_by_id_valid_input_deleted_file() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file_id = Guid::new_v4();
        context
            .file_repository()
            .create(&File::new(
                Some(file_id),
                Some(ROOT_FOLDER_ID),
                "file".try_into().unwrap(),
            ))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Act

        context
            .file_repository()
            .delete_by_id(file_id)
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let actual = context.file_repository().get_all_files().await.unwrap();
        assert_eq!(0, actual.len());
    }
}

mod file_row {
    use super::*;

    pub(super) struct FileRow {
        pub id: Guid,
        pub parent_id: Option<Guid>,
        pub name: String,
    }

    impl From<FileRow> for File {
        fn from(value: FileRow) -> Self {
            File::new(
                Some(value.id),
                value.parent_id,
                FileSystemItemName::new_unchecked(value.name.clone()),
            )
        }
    }
}
