use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::reading::Reading;
use crate::elements::entities::reading::ReadingSource;
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

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

        meta_repo
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

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

        meta_repo
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

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

        meta_repo
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

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

        let actual = meta_repo
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
