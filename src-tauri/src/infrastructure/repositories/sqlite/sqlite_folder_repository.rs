use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use fractional_index::FractionalIndex;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::folder::Folder;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::repositories::sqlite::sqlite_rows::folder_row::FolderRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteFolderRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl FolderRepository for SqliteFolderRepository {
    async fn create(&self, folder: Folder) -> Result<(), RepositoryError> {
        let (parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id) =
            match folder.meta.parent {
                None => (None, None, None, None),
                Some(ElementId::Folder(id)) => (Some(id), None, None, None),
                Some(ElementId::Reading(id)) => (None, Some(id), None, None),
                Some(ElementId::Extract(id)) => (None, None, Some(id), None),
                Some(ElementId::Card(id)) => (None, None, None, Some(id)),
            };
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(
            "INSERT INTO meta (id, name, position, parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id, created_at, modified_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, datetime($8), datetime($9))",
            folder.meta.id,
            folder.meta.name,
            folder.meta.position.as_bytes(),
            parent_folder_id,
            parent_reading_id,
            parent_extract_id,
            parent_card_id,
            folder.meta.created_at,
            folder.meta.modified_at,
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!("INSERT INTO folders (id) VALUES ($1)", folder.meta.id)
            .execute(&mut *tx)
            .await?;

        Ok(())
    }

    async fn get_all(&self) -> Result<Vec<Folder>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            FolderRow,
            r#"SELECT
                m.id as "id: _",
                m.name,
                m.position as "position: _",
                m.parent_reading_id as "parent_reading_id: _",
                m.parent_extract_id as "parent_extract_id: _",
                m.parent_folder_id as "parent_folder_id: _",
                m.parent_card_id as "parent_card_id: _",
                m.created_at as "created_at: _",
                m.modified_at as "modified_at: _"
            FROM folders f
            INNER JOIN meta m ON f.id = m.id
            ORDER BY m.position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                et.element_id as "element_id: Uuid",
                et.tag_id as "tag_id: Uuid"
            FROM element_tags et
            INNER JOIN folders f ON et.element_id = f.id"#
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
                let mut entity: Folder = row.into();
                entity.meta.tags = tags_by_id.remove(&id).unwrap_or_default();
                entity
            })
            .collect())
    }
}

#[async_trait]
impl ElementRepository for SqliteFolderRepository {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(r#"DELETE FROM folders WHERE id = $1"#, uuid)
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
            r#"SELECT EXISTS(SELECT 1 FROM folders WHERE id = $1) as "exists: bool""#,
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
            r#"SELECT parent_folder_id as "parent_folder_id: uuid::Uuid", position as "position: Vec<u8>"
               FROM meta WHERE id = $1"#,
            uuid
        )
        .fetch_one(&mut *tx)
        .await?;
        Ok((
            row.parent_folder_id.map(ElementId::Folder),
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
            match new_parent {
                None => (None, None, None, None),
                Some(ElementId::Folder(pid)) => (Some(pid), None, None, None),
                Some(ElementId::Reading(pid)) => (None, Some(pid), None, None),
                Some(ElementId::Extract(pid)) => (None, None, Some(pid), None),
                Some(ElementId::Card(pid)) => (None, None, None, Some(pid)),
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
                card_repository::CardRepository, extract_repository::ExtractRepository,
                folder_repository::FolderRepository, reading_repository::ReadingRepository,
            },
            value_objects::{element_id::ElementId, meta::Meta},
        },
        infrastructure::repositories::sqlite::{
            sqlite_card_repository::SqliteCardRepository,
            sqlite_extract_repository::SqliteExtractRepository,
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
        injector
    }

    fn make_meta() -> Meta {
        Meta {
            id: Uuid::new_v4(),
            name: "test".into(),
            parent: None,
            tags: Vec::new(),
            position: FractionalIndex::default(),
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn delete_folder_with_child_folder_cascades_to_child_folder() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let parent = Folder { meta: make_meta() };
        let child = Folder {
            meta: Meta {
                parent: Some(ElementId::Folder(parent.meta.id)),
                ..make_meta()
            },
        };
        folder_repo.create(parent.clone()).await.unwrap();
        folder_repo.create(child.clone()).await.unwrap();

        // Act

        folder_repo
            .delete(ElementId::Folder(parent.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = folder_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|f| f.meta.id == child.meta.id));
    }

    #[tokio::test]
    async fn delete_folder_with_reading_cascades_to_reading() {
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
        folder_repo.create(folder.clone()).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();

        // Act

        folder_repo
            .delete(ElementId::Folder(folder.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = reading_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|r| r.meta.id == reading.meta.id));
    }

    #[tokio::test]
    async fn delete_folder_with_direct_extract_cascades_to_extract() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let extract_repo = scope.resolve::<dyn ExtractRepository>().await;

        let folder = Folder { meta: make_meta() };
        let extract = Extract {
            meta: Meta {
                parent: Some(ElementId::Folder(folder.meta.id)),
                ..make_meta()
            },
            text: String::new(),
        };
        folder_repo.create(folder.clone()).await.unwrap();
        extract_repo.create(extract.clone()).await.unwrap();

        // Act

        folder_repo
            .delete(ElementId::Folder(folder.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = extract_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|e| e.meta.id == extract.meta.id));
    }

    #[tokio::test]
    async fn delete_folder_with_direct_card_cascades_to_card() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let card_repo = scope.resolve::<dyn CardRepository>().await;

        let folder = Folder { meta: make_meta() };
        let card = Card {
            meta: Meta {
                parent: Some(ElementId::Folder(folder.meta.id)),
                ..make_meta()
            },
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder.clone()).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        folder_repo
            .delete(ElementId::Folder(folder.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = card_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|c| c.meta.id == card.meta.id));
    }

    #[tokio::test]
    async fn rename_folder_valid_name_updates_name() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let folder = Folder { meta: make_meta() };
        folder_repo.create(folder.clone()).await.unwrap();

        // Act

        folder_repo
            .rename(ElementId::Folder(folder.meta.id), "renamed".into())
            .await
            .unwrap();

        // Assert

        let remaining = folder_repo.get_all().await.unwrap();
        let updated = remaining
            .iter()
            .find(|f| f.meta.id == folder.meta.id)
            .unwrap();
        assert_eq!("renamed", updated.meta.name);
    }

    #[tokio::test]
    async fn exists_folder_present_returns_true() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let folder = Folder { meta: make_meta() };
        folder_repo.create(folder.clone()).await.unwrap();

        // Act

        let actual = folder_repo
            .exists(ElementId::Folder(folder.meta.id))
            .await
            .unwrap();

        // Assert

        assert!(actual);
    }

    #[tokio::test]
    async fn exists_folder_absent_returns_false() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        // Act

        let actual = folder_repo
            .exists(ElementId::Folder(Uuid::new_v4()))
            .await
            .unwrap();

        // Assert

        assert!(!actual);
    }
}
