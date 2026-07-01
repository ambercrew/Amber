use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::reading::Reading;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::infrastructure::repositories::sqlite::sqlite_rows::reading_row::ReadingRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteReadingRepository {
    tx: Arc<DbTransaction>,
    meta_repository: Arc<dyn MetaRepository>,
}

#[async_trait]
impl ReadingRepository for SqliteReadingRepository {
    async fn create(&self, reading: Reading) -> Result<(), RepositoryError> {
        self.meta_repository.create_meta(&reading.meta).await?;

        let uuid = reading.meta.element_id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO readings (id, body) VALUES ($1, $2)",
            uuid,
            reading.body,
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn get_all(&self) -> Result<Vec<Reading>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            ReadingRow,
            r#"SELECT
                m.element_id as "id: _",
                m.name,
                m.position as "position: _",
                m.parent_id as "parent_id: _",
                m.parent_type,
                m.created_at as "created_at: _",
                m.modified_at as "modified_at: _",
                r.body
            FROM readings r
            INNER JOIN meta m ON r.id = m.element_id
            ORDER BY m.position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows.into_iter().map(|row| row.into()).collect())
    }

    async fn get_by_id(&self, id: Uuid) -> Result<Reading, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            ReadingRow,
            r#"SELECT
                m.element_id as "id: _",
                m.name,
                m.position as "position: _",
                m.parent_id as "parent_id: _",
                m.parent_type,
                m.created_at as "created_at: _",
                m.modified_at as "modified_at: _",
                r.body
            FROM readings r
            INNER JOIN meta m ON r.id = m.element_id
            WHERE r.id = $1"#,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        Ok(row.into())
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use fractional_index::FractionalIndex;
    use injector::{injector::Injector, register_scope};
    use uuid::Uuid;

    use crate::{
        elements::{
            entities::{card::Card, extract::Extract, folder::Folder, reading::Reading},
            repositories::{
                card_repository::CardRepository, extract_repository::ExtractRepository,
                folder_repository::FolderRepository, meta_repository::MetaRepository,
                reading_repository::ReadingRepository,
            },
            value_objects::{element_id::ElementId, meta::Meta},
        },
        infrastructure::repositories::sqlite::{
            sqlite_card_repository::SqliteCardRepository,
            sqlite_extract_repository::SqliteExtractRepository,
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_meta_repository::SqliteMetaRepository,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(injector, dyn CardRepository, SqliteCardRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        injector
    }

    fn make_meta(id: ElementId) -> Meta {
        Meta {
            element_id: id,
            name: "test".into(),
            parent: None,
            position: FractionalIndex::default(),
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    fn folder_meta() -> Meta {
        make_meta(ElementId::Folder(Uuid::new_v4()))
    }
    fn reading_meta() -> Meta {
        make_meta(ElementId::Reading(Uuid::new_v4()))
    }
    fn extract_meta() -> Meta {
        make_meta(ElementId::Extract(Uuid::new_v4()))
    }
    fn card_meta() -> Meta {
        make_meta(ElementId::Card(Uuid::new_v4()))
    }

    #[tokio::test]
    async fn delete_reading_with_extract_cascades_to_extract() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let extract_repo = scope.resolve::<dyn ExtractRepository>().await;
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            body: String::new(),
        };
        let extract = Extract {
            meta: Meta {
                parent: Some(reading.meta.element_id),
                ..extract_meta()
            },
            text: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();
        extract_repo.create(extract.clone()).await.unwrap();

        // Act

        meta_repo.delete(reading.meta.element_id).await.unwrap();

        // Assert

        let remaining = extract_repo.get_all().await.unwrap();
        assert!(
            !remaining
                .iter()
                .any(|e| e.meta.element_id == extract.meta.element_id)
        );
    }

    #[tokio::test]
    async fn delete_reading_with_card_cascades_to_card() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let card_repo = scope.resolve::<dyn CardRepository>().await;
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            body: String::new(),
        };
        let card = Card {
            meta: Meta {
                parent: Some(reading.meta.element_id),
                ..card_meta()
            },
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        meta_repo.delete(reading.meta.element_id).await.unwrap();

        // Assert

        let remaining = card_repo.get_all().await.unwrap();
        assert!(
            !remaining
                .iter()
                .any(|c| c.meta.element_id == card.meta.element_id)
        );
    }

    #[tokio::test]
    async fn rename_reading_valid_name_updates_name() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            body: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();

        // Act

        meta_repo
            .rename(reading.meta.element_id, "renamed".into())
            .await
            .unwrap();

        // Assert

        let remaining = reading_repo.get_all().await.unwrap();
        let updated = remaining
            .iter()
            .find(|r| r.meta.element_id == reading.meta.element_id)
            .unwrap();
        assert_eq!("renamed", updated.meta.name);
    }

    #[tokio::test]
    async fn exists_reading_present_returns_true() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            body: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();

        // Act

        let actual = meta_repo.exists(reading.meta.element_id).await.unwrap();

        // Assert

        assert!(actual);
    }

    #[tokio::test]
    async fn exists_reading_absent_returns_false() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        // Act

        let actual = meta_repo
            .exists(ElementId::Reading(Uuid::new_v4()))
            .await
            .unwrap();

        // Assert

        assert!(!actual);
    }
}
