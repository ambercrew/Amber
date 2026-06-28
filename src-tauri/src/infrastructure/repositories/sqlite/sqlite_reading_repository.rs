use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::reading::Reading;
use crate::elements::entities::reading::ReadingSource;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::repositories::sqlite::sqlite_rows::reading_row::ReadingRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteReadingRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl ReadingRepository for SqliteReadingRepository {
    async fn create(&self, reading: Reading) -> Result<(), RepositoryError> {
        let position = reading.meta.position as i64;
        let (source_type, source_url) = match reading.source {
            ReadingSource::Website { url } => ("website".to_string(), Some(url)),
            ReadingSource::Clipboard => ("clipboard".to_string(), None),
            ReadingSource::Pdf => ("pdf".to_string(), None),
        };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO readings (id, name, position, folder_id, created_at, modified_at, source_type, source_url, body)
             VALUES ($1, $2, $3, $4, datetime($5), datetime($6), $7, $8, $9)",
            reading.meta.id,
            reading.meta.name,
            position,
            reading.folder_id,
            reading.meta.created_at,
            reading.meta.modified_at,
            source_type,
            source_url,
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
                id as "id: _",
                name,
                position as "position: _",
                folder_id as "folder_id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                source_type,
                source_url,
                body
            FROM readings
            ORDER BY position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                reading_id as "reading_id: Uuid",
                tag_id as "tag_id: Uuid"
            FROM reading_tags"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut tags_by_id: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in tag_rows {
            tags_by_id
                .entry(row.reading_id)
                .or_default()
                .push(row.tag_id);
        }

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut entity: Reading = row.into();
                entity.tags = tags_by_id.remove(&id).unwrap_or_default();
                entity
            })
            .collect())
    }
}

#[async_trait]
impl ElementRepository for SqliteReadingRepository {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(r#"DELETE FROM readings WHERE id = $1"#, uuid)
            .execute(&mut *tx)
            .await?;
        Ok(())
    }

    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE readings SET name = $1 WHERE id = $2"#,
            new_name,
            uuid
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};
    use uuid::Uuid;

    use crate::{
        elements::{
            entities::{
                card::Card,
                extract::Extract,
                folder::Folder,
                reading::{Reading, ReadingSource},
            },
            repositories::{
                card_repository::CardRepository, element_repository::ElementRepository,
                extract_repository::ExtractRepository, folder_repository::FolderRepository,
                reading_repository::ReadingRepository,
            },
            value_objects::{
                card_parent::CardParent, element_id::ElementId, extract_parent::ExtractParent,
                meta::Meta,
            },
        },
        infrastructure::repositories::sqlite::{
            sqlite_card_repository::SqliteCardRepository,
            sqlite_element_repository::SqliteElementRepository,
            sqlite_extract_repository::SqliteExtractRepository,
            sqlite_folder_repository::SqliteFolderRepository,
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
        register_scope!(injector, dyn ElementRepository, SqliteElementRepository);
        injector
    }

    fn make_meta() -> Meta {
        Meta {
            id: Uuid::new_v4(),
            name: "test".into(),
            position: 0,
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn delete_reading_with_extract_cascades_to_extract() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let extract_repo = scope.resolve::<dyn ExtractRepository>().await;
        let element_repo = scope.resolve::<dyn ElementRepository>().await;

        let folder = Folder {
            meta: make_meta(),
            parent_folder_id: None,
            tags: vec![],
        };
        let reading = Reading {
            meta: make_meta(),
            folder_id: folder.meta.id,
            tags: vec![],
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let extract = Extract {
            meta: make_meta(),
            parent: ExtractParent::Reading(reading.meta.id),
            tags: vec![],
            text: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();
        extract_repo.create(extract.clone()).await.unwrap();

        // Act

        element_repo
            .delete(ElementId::Reading(reading.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = extract_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|e| e.meta.id == extract.meta.id));
    }

    #[tokio::test]
    async fn delete_reading_with_card_cascades_to_card() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let card_repo = scope.resolve::<dyn CardRepository>().await;
        let element_repo = scope.resolve::<dyn ElementRepository>().await;

        let folder = Folder {
            meta: make_meta(),
            parent_folder_id: None,
            tags: vec![],
        };
        let reading = Reading {
            meta: make_meta(),
            folder_id: folder.meta.id,
            tags: vec![],
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let card = Card {
            meta: make_meta(),
            parent: CardParent::Reading(reading.meta.id),
            tags: vec![],
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        element_repo
            .delete(ElementId::Reading(reading.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = card_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|c| c.meta.id == card.meta.id));
    }

    #[tokio::test]
    async fn rename_reading_valid_name_updates_name() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let element_repo = scope.resolve::<dyn ElementRepository>().await;

        let folder = Folder {
            meta: make_meta(),
            parent_folder_id: None,
            tags: vec![],
        };
        let reading = Reading {
            meta: make_meta(),
            folder_id: folder.meta.id,
            tags: vec![],
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();

        // Act

        element_repo
            .rename(ElementId::Reading(reading.meta.id), "renamed".into())
            .await
            .unwrap();

        // Assert

        let remaining = reading_repo.get_all().await.unwrap();
        let updated = remaining
            .iter()
            .find(|r| r.meta.id == reading.meta.id)
            .unwrap();
        assert_eq!("renamed", updated.meta.name);
    }
}
