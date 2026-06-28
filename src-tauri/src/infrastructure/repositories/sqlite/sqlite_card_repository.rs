use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use fractional_index::FractionalIndex;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::card::Card;
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::repositories::sqlite::sqlite_rows::card_row::CardRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteCardRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl CardRepository for SqliteCardRepository {
    async fn create(&self, card: Card) -> Result<(), RepositoryError> {
        let (parent_folder_id, parent_reading_id, parent_extract_id, parent_card_id) =
            match card.meta.parent.expect("cards must have a parent") {
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
            card.meta.id,
            card.meta.name,
            card.meta.position.as_bytes(),
            parent_folder_id,
            parent_reading_id,
            parent_extract_id,
            parent_card_id,
            card.meta.created_at,
            card.meta.modified_at,
        )
        .execute(&mut *tx)
        .await?;
        sqlx::query!(
            "INSERT INTO cards (id, front, back) VALUES ($1, $2, $3)",
            card.meta.id,
            card.front,
            card.back,
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn get_all(&self) -> Result<Vec<Card>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            CardRow,
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
                c.front,
                c.back
            FROM cards c
            INNER JOIN meta m ON c.id = m.id
            ORDER BY m.position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                et.element_id as "element_id: Uuid",
                et.tag_id as "tag_id: Uuid"
            FROM element_tags et
            INNER JOIN cards c ON et.element_id = c.id"#
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
                let mut entity: Card = row.into();
                entity.meta.tags = tags_by_id.remove(&id).unwrap_or_default();
                entity
            })
            .collect())
    }
}

#[async_trait]
impl ElementRepository for SqliteCardRepository {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        let uuid = id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(r#"DELETE FROM cards WHERE id = $1"#, uuid)
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
            r#"SELECT EXISTS(SELECT 1 FROM cards WHERE id = $1) as "exists: bool""#,
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
            match new_parent.expect("cards must have a parent") {
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
            sqlite_element_repository::SqliteElementRepository,
            sqlite_extract_repository::SqliteExtractRepository,
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
            parent: None,
            position: FractionalIndex::default(),
            tags: vec![],
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn delete_card_valid_id_removes_card() {
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
        reading_repo.create(reading).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        element_repo
            .delete(ElementId::Card(card.meta.id))
            .await
            .unwrap();

        // Assert

        let remaining = card_repo.get_all().await.unwrap();
        assert!(!remaining.iter().any(|c| c.meta.id == card.meta.id));
    }

    #[tokio::test]
    async fn rename_card_valid_name_updates_name() {
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
        reading_repo.create(reading).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        element_repo
            .rename(ElementId::Card(card.meta.id), "renamed".into())
            .await
            .unwrap();

        // Assert

        let remaining = card_repo.get_all().await.unwrap();
        let updated = remaining
            .iter()
            .find(|c| c.meta.id == card.meta.id)
            .unwrap();
        assert_eq!("renamed", updated.meta.name);
    }

    #[tokio::test]
    async fn exists_card_present_returns_true() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let card_repo = scope.resolve::<dyn CardRepository>().await;

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
        reading_repo.create(reading).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        let actual = card_repo
            .exists(ElementId::Card(card.meta.id))
            .await
            .unwrap();

        // Assert

        assert!(actual);
    }

    #[tokio::test]
    async fn exists_card_absent_returns_false() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let card_repo = scope.resolve::<dyn CardRepository>().await;

        // Act

        let actual = card_repo
            .exists(ElementId::Card(Uuid::new_v4()))
            .await
            .unwrap();

        // Assert

        assert!(!actual);
    }
}
