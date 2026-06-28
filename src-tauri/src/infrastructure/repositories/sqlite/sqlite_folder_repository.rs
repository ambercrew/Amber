use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::folder::Folder;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::infrastructure::repositories::sqlite::sqlite_rows::folder_row::FolderRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteFolderRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl FolderRepository for SqliteFolderRepository {
    async fn create(&self, folder: Folder) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(
            "INSERT INTO meta (id, name, position, parent_id, parent_type, created_at, modified_at)
             VALUES ($1, $2, $3, $4, $5, datetime($6), datetime($7))",
            folder.meta.id,
            folder.meta.name,
            folder.meta.position.as_bytes(),
            folder.meta.parent.map(|p| p.id()),
            folder.meta.parent.map(|p| p.element_name()),
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
                m.parent_id as "parent_id: _",
                m.parent_type,
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

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

        meta_repo
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
        folder_repo.create(folder.clone()).await.unwrap();
        reading_repo.create(reading.clone()).await.unwrap();

        // Act

        meta_repo
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

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

        meta_repo
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

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

        meta_repo
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder { meta: make_meta() };
        folder_repo.create(folder.clone()).await.unwrap();

        // Act

        meta_repo
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder { meta: make_meta() };
        folder_repo.create(folder.clone()).await.unwrap();

        // Act

        let actual = meta_repo
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
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        // Act

        let actual = meta_repo
            .exists(ElementId::Folder(Uuid::new_v4()))
            .await
            .unwrap();

        // Assert

        assert!(!actual);
    }
}
