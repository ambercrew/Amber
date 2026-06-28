use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::extract::Extract;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteExtractRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl ExtractRepository for SqliteExtractRepository {
    async fn create(&self, extract: Extract) -> Result<(), RepositoryError> {
        let (parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id) =
            match extract.meta.parent.expect("extracts must have a parent") {
                ElementId::Folder(pid) => (Some(pid), None, None, None),
                ElementId::Reading(pid) => (None, Some(pid), None, None),
                ElementId::Extract(pid) => (None, None, Some(pid), None),
                ElementId::Card(pid) => (None, None, None, Some(pid)),
            };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO meta (id, name, position, parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id, created_at, modified_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, datetime($8), datetime($9))",
            extract.meta.id,
            extract.meta.name,
            extract.meta.position.as_bytes(),
            parent_folder_id,
            parent_reading_id,
            parent_extract_id,
            parent_card_id,
            extract.meta.created_at,
            extract.meta.modified_at,
        )
        .execute(&mut *tx)
        .await?;
        sqlx::query!(
            "INSERT INTO extracts (id, text) VALUES ($1, $2)",
            extract.meta.id,
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
                m.id as "id: _",
                m.name,
                m.position as "position: _",
                m.parent_reading_id as "parent_reading_id: _",
                m.parent_extract_id as "parent_extract_id: _",
                m.parent_folder_id as "parent_folder_id: _",
                m.parent_card_id as "parent_card_id: _",
                m.created_at as "created_at: _",
                m.modified_at as "modified_at: _",
                e.text
            FROM extracts e
            INNER JOIN meta m ON e.id = m.id
            ORDER BY m.position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                et.element_id as "element_id: Uuid",
                et.tag_id as "tag_id: Uuid"
            FROM element_tags et
            INNER JOIN extracts e ON et.element_id = e.id"#
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
                let mut entity: Extract = row.into();
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
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_meta_repository::SqliteMetaRepository,
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
    async fn delete_extract_with_child_extract_cascades_to_child_extract() {
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
        let parent_extract = Extract {
            meta: Meta {
                parent: Some(ElementId::Reading(reading.meta.id)),
                ..make_meta()
            },
            text: String::new(),
        };
        let child_extract = Extract {
            meta: Meta {
                parent: Some(ElementId::Extract(parent_extract.meta.id)),
                ..make_meta()
            },
            text: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading).await.unwrap();
        extract_repo.create(parent_extract.clone()).await.unwrap();
        extract_repo.create(child_extract.clone()).await.unwrap();

        // Act

        meta_repo
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
        let card = Card {
            meta: Meta {
                parent: Some(ElementId::Extract(extract.meta.id)),
                ..make_meta()
            },
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading).await.unwrap();
        extract_repo.create(extract.clone()).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        meta_repo
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
        reading_repo.create(reading).await.unwrap();
        extract_repo.create(extract.clone()).await.unwrap();

        // Act

        meta_repo
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

    #[tokio::test]
    async fn exists_extract_present_returns_true() {
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
        reading_repo.create(reading).await.unwrap();
        extract_repo.create(extract.clone()).await.unwrap();

        // Act

        let actual = meta_repo
            .exists(ElementId::Extract(extract.meta.id))
            .await
            .unwrap();

        // Assert

        assert!(actual);
    }

    #[tokio::test]
    async fn exists_extract_absent_returns_false() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        // Act

        let actual = meta_repo
            .exists(ElementId::Extract(Uuid::new_v4()))
            .await
            .unwrap();

        // Assert

        assert!(!actual);
    }
}
