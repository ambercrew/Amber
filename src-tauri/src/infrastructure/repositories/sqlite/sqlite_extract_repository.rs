use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::extract::Extract;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::extract_parent::ExtractParent;
use crate::infrastructure::repositories::sqlite::sqlite_rows::extract_row::ExtractRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteExtractRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl ExtractRepository for SqliteExtractRepository {
    async fn create(&self, extract: Extract) -> Result<(), RepositoryError> {
        let position = extract.meta.position as i64;
        let (parent_reading_id, parent_extract_id, parent_folder_id) = match extract.parent {
            ExtractParent::Reading(pid) => (Some(pid), None, None),
            ExtractParent::Extract(pid) => (None, Some(pid), None),
            ExtractParent::Folder(pid) => (None, None, Some(pid)),
        };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO extracts (id, name, position, parent_reading_id, parent_extract_id, parent_folder_id, created_at, modified_at, text)
             VALUES ($1, $2, $3, $4, $5, $6, datetime($7), datetime($8), $9)",
            extract.meta.id,
            extract.meta.name,
            position,
            parent_reading_id,
            parent_extract_id,
            parent_folder_id,
            extract.meta.created_at,
            extract.meta.modified_at,
            extract.text,
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn get_all(&self) -> Result<Vec<Extract>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            ExtractRow,
            r#"SELECT
                id as "id: _",
                name,
                position as "position: _",
                parent_reading_id as "parent_reading_id: _",
                parent_extract_id as "parent_extract_id: _",
                parent_folder_id as "parent_folder_id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                text
            FROM extracts
            ORDER BY position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                extract_id as "extract_id: Uuid",
                tag_id as "tag_id: Uuid"
            FROM extract_tags"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut tags_by_id: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in tag_rows {
            tags_by_id
                .entry(row.extract_id)
                .or_default()
                .push(row.tag_id);
        }

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut entity: Extract = row.into();
                entity.tags = tags_by_id.remove(&id).unwrap_or_default();
                entity
            })
            .collect())
    }
}

#[async_trait]
impl ElementRepository for SqliteExtractRepository {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(r#"DELETE FROM extracts WHERE id = $1"#, uuid)
            .execute(&mut *tx)
            .await?;
        Ok(())
    }

    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE extracts SET name = $1 WHERE id = $2"#,
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
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_reading_repository::SqliteReadingRepository,
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
    async fn delete_extract_with_child_extract_cascades_to_child_extract() {
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
        let parent_extract = Extract {
            meta: make_meta(),
            parent: ExtractParent::Reading(reading.meta.id),
            tags: vec![],
            text: String::new(),
        };
        let child_extract = Extract {
            meta: make_meta(),
            parent: ExtractParent::Extract(parent_extract.meta.id),
            tags: vec![],
            text: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading).await.unwrap();
        extract_repo.create(parent_extract.clone()).await.unwrap();
        extract_repo.create(child_extract.clone()).await.unwrap();

        // Act

        element_repo
            .delete(ElementId::Extract(parent_extract.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = extract_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|e| e.meta.id == child_extract.meta.id));
    }

    #[tokio::test]
    async fn delete_extract_with_card_cascades_to_card() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let extract_repo = scope.resolve::<dyn ExtractRepository>().await;
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
        let extract = Extract {
            meta: make_meta(),
            parent: ExtractParent::Reading(reading.meta.id),
            tags: vec![],
            text: String::new(),
        };
        let card = Card {
            meta: make_meta(),
            parent: CardParent::Extract(extract.meta.id),
            tags: vec![],
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading).await.unwrap();
        extract_repo.create(extract.clone()).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        element_repo
            .delete(ElementId::Extract(extract.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = card_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|c| c.meta.id == card.meta.id));
    }

    #[tokio::test]
    async fn rename_extract_valid_name_updates_name() {
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
        reading_repo.create(reading).await.unwrap();
        extract_repo.create(extract.clone()).await.unwrap();

        // Act

        element_repo
            .rename(ElementId::Extract(extract.meta.id), "renamed".into())
            .await
            .unwrap();

        // Assert

        let remaining = extract_repo.get_all().await.unwrap();
        let updated = remaining
            .iter()
            .find(|e| e.meta.id == extract.meta.id)
            .unwrap();
        assert_eq!("renamed", updated.meta.name);
    }
}
