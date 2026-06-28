use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::card::Card;
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::infrastructure::repositories::sqlite::sqlite_rows::card_row::CardRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteCardRepository {
    tx: Arc<DbTransaction>,
    meta_repository: Arc<dyn MetaRepository>,
}

#[async_trait]
impl CardRepository for SqliteCardRepository {
    async fn create(&self, card: Card) -> Result<(), RepositoryError> {
        self.meta_repository.create_meta(&card.meta).await?;

        let uuid = card.meta.id.id();
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO cards (id, front, back) VALUES ($1, $2, $3)",
            uuid,
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
                m.parent_id as "parent_id: _",
                m.parent_type,
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
                card_repository::CardRepository, extract_repository::ExtractRepository,
                folder_repository::FolderRepository, meta_repository::MetaRepository,
                reading_repository::ReadingRepository,
            },
            value_objects::{element_id::ElementId, meta::Meta},
        },
        infrastructure::repositories::sqlite::{
            sqlite_extract_repository::SqliteExtractRepository,
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

    fn make_meta(id: ElementId) -> Meta {
        Meta {
            id,
            name: "test".into(),
            parent: None,
            position: FractionalIndex::default(),
            tags: vec![],
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
    fn card_meta() -> Meta {
        make_meta(ElementId::Card(Uuid::new_v4()))
    }

    #[tokio::test]
    async fn delete_card_valid_id_removes_card() {
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
                parent: Some(folder.meta.id),
                ..reading_meta()
            },
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let card = Card {
            meta: Meta {
                parent: Some(reading.meta.id),
                ..card_meta()
            },
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        meta_repo.delete(card.meta.id).await.unwrap();

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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            meta: Meta {
                parent: Some(folder.meta.id),
                ..reading_meta()
            },
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let card = Card {
            meta: Meta {
                parent: Some(reading.meta.id),
                ..card_meta()
            },
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        meta_repo
            .rename(card.meta.id, "renamed".into())
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            meta: Meta {
                parent: Some(folder.meta.id),
                ..reading_meta()
            },
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let card = Card {
            meta: Meta {
                parent: Some(reading.meta.id),
                ..card_meta()
            },
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo.create(reading).await.unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        let actual = meta_repo.exists(card.meta.id).await.unwrap();

        // Assert

        assert!(actual);
    }

    #[tokio::test]
    async fn exists_card_absent_returns_false() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        // Act

        let actual = meta_repo
            .exists(ElementId::Card(Uuid::new_v4()))
            .await
            .unwrap();

        // Assert

        assert!(!actual);
    }
}
