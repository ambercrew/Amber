use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use fractional_index::FractionalIndex;
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
        let (source_type, source_url) = match reading.source {
            ReadingSource::Website { url } => ("website".to_string(), Some(url)),
            ReadingSource::Clipboard => ("clipboard".to_string(), None),
            ReadingSource::Pdf => ("pdf".to_string(), None),
        };
        let (parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id) =
            match reading.meta.parent.expect("readings must have a parent") {
                ElementId::Folder(id) => (Some(id), None, None, None),
                ElementId::Reading(id) => (None, Some(id), None, None),
                ElementId::Extract(id) => (None, None, Some(id), None),
                ElementId::Card(id) => (None, None, None, Some(id)),
            };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO meta (id, name, position, parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id, created_at, modified_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, datetime($8), datetime($9))",
            reading.meta.id,
            reading.meta.name,
            reading.meta.position.as_bytes(),
            parent_folder_id,
            parent_reading_id,
            parent_extract_id,
            parent_card_id,
            reading.meta.created_at,
            reading.meta.modified_at,
        )
        .execute(&mut *tx)
        .await?;
        sqlx::query!(
            "INSERT INTO readings (id, source_type, source_url, body) VALUES ($1, $2, $3, $4)",
            reading.meta.id,
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
                m.id as "id: _",
                m.name,
                m.position as "position: _",
                m.parent_reading_id as "parent_reading_id: _",
                m.parent_extract_id as "parent_extract_id: _",
                m.parent_folder_id as "parent_folder_id: _",
                m.parent_card_id as "parent_card_id: _",
                m.created_at as "created_at: _",
                m.modified_at as "modified_at: _",
                r.source_type,
                r.source_url,
                r.body
            FROM readings r
            INNER JOIN meta m ON r.id = m.id
            ORDER BY m.position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                et.element_id as "element_id: Uuid",
                et.tag_id as "tag_id: Uuid"
            FROM element_tags et
            INNER JOIN readings r ON et.element_id = r.id"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut tags_by_id: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in tag_rows {
            tags_by_id
                .entry(row.element_id)
                .or_default()
                .push(row.tag_id);
        }

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut entity: Reading = row.into();
                entity.meta.tags = tags_by_id.remove(&id).unwrap_or_default();
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
        sqlx::query!(r#"UPDATE meta SET name = $1 WHERE id = $2"#, new_name, uuid)
            .execute(&mut *tx)
            .await?;
        Ok(())
    }

    async fn exists(&self, id: ElementId) -> Result<bool, RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        let row = sqlx::query!(
            r#"SELECT EXISTS(SELECT 1 FROM readings WHERE id = $1) as "exists: bool""#,
            uuid
        )
        .fetch_one(&mut *tx)
        .await?;
        Ok(row.exists)
    }

    async fn get_location(
        &self,
        id: ElementId,
    ) -> Result<(Option<ElementId>, FractionalIndex), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        let row = sqlx::query!(
            r#"SELECT
                parent_folder_id  as "parent_folder_id: uuid::Uuid",
                parent_reading_id as "parent_reading_id: uuid::Uuid",
                parent_extract_id as "parent_extract_id: uuid::Uuid",
                parent_card_id    as "parent_card_id: uuid::Uuid",
                position as "position: Vec<u8>"
               FROM meta WHERE id = $1"#,
            uuid
        )
        .fetch_one(&mut *tx)
        .await?;
        let parent = if let Some(pid) = row.parent_folder_id {
            Some(ElementId::Folder(pid))
        } else if let Some(pid) = row.parent_reading_id {
            Some(ElementId::Reading(pid))
        } else if let Some(pid) = row.parent_extract_id {
            Some(ElementId::Extract(pid))
        } else {
            row.parent_card_id.map(ElementId::Card)
        };
        Ok((
            parent,
            FractionalIndex::from_bytes(row.position).expect("Invalid fractional index"),
        ))
    }

    async fn move_to(
        &self,
        id: ElementId,
        new_parent: Option<ElementId>,
        new_position: FractionalIndex,
    ) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let (parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id) =
            match new_parent.expect("readings must have a parent") {
                ElementId::Folder(pid) => (Some(pid), None, None, None),
                ElementId::Reading(pid) => (None, Some(pid), None, None),
                ElementId::Extract(pid) => (None, None, Some(pid), None),
                ElementId::Card(pid) => (None, None, None, Some(pid)),
            };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            r#"UPDATE meta
               SET parent_folder_id = $1, parent_reading_id = $2, parent_extract_id = $3, parent_card_id = $4, position = $5
               WHERE id = $6"#,
            parent_folder_id,
            parent_reading_id,
            parent_extract_id,
            parent_card_id,
            new_position.as_bytes(),
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
    use fractional_index::FractionalIndex;
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
            value_objects::{element_id::ElementId, meta::Meta},
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
            parent: None,
            position: FractionalIndex::default(),
            tags: vec![],
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

        let folder = Folder { meta: make_meta() };
        let reading = Reading {
            meta: Meta {
                parent: Some(ElementId::Folder(folder.meta.id)),
                ..make_meta()
            },
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let extract = Extract {
            meta: Meta {
                parent: Some(ElementId::Reading(reading.meta.id)),
                ..make_meta()
            },
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

        let folder = Folder { meta: make_meta() };
        let reading = Reading {
            meta: Meta {
                parent: Some(ElementId::Folder(folder.meta.id)),
                ..make_meta()
            },
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let card = Card {
            meta: Meta {
                parent: Some(ElementId::Reading(reading.meta.id)),
                ..make_meta()
            },
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

        let folder = Folder { meta: make_meta() };
        let reading = Reading {
            meta: Meta {
                parent: Some(ElementId::Folder(folder.meta.id)),
                ..make_meta()
            },
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

    #[tokio::test]
    async fn exists_reading_present_returns_true() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;

        let folder = Folder { meta: make_meta() };
        let reading = Reading {
            meta: Meta {
                parent: Some(ElementId::Folder(folder.meta.id)),
                ..make_meta()
            },
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();

        // Act

        let actual = reading_repo
            .exists(ElementId::Reading(reading.meta.id))
            .await
            .unwrap();

        // Assert

        assert!(actual);
    }

    #[tokio::test]
    async fn exists_reading_absent_returns_false() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;

        // Act

        let actual = reading_repo
            .exists(ElementId::Reading(Uuid::new_v4()))
            .await
            .unwrap();

        // Assert

        assert!(!actual);
    }
}
