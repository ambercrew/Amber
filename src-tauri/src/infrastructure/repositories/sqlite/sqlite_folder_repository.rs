use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
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
        let position = folder.meta.position as i64;
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "INSERT INTO folders (id, name, position, parent_folder_id, created_at, modified_at)
             VALUES ($1, $2, $3, $4, datetime($5), datetime($6))",
            folder.meta.id,
            folder.meta.name,
            position,
            folder.parent_folder_id,
            folder.meta.created_at,
            folder.meta.modified_at,
        )
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
                id as "id: _",
                name,
                position as "position: _",
                parent_folder_id as "parent_folder_id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _"
            FROM folders
            ORDER BY position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let tag_rows = sqlx::query!(
            r#"SELECT
                folder_id as "folder_id: Uuid",
                tag_id as "tag_id: Uuid"
            FROM folder_tags"#
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut tags_by_id: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for row in tag_rows {
            tags_by_id
                .entry(row.folder_id)
                .or_default()
                .push(row.tag_id);
        }

        Ok(rows
            .into_iter()
            .map(|row| {
                let id = row.id;
                let mut entity: Folder = row.into();
                entity.tags = tags_by_id.remove(&id).unwrap_or_default();
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
        sqlx::query!(
            r#"UPDATE folders SET name = $1 WHERE id = $2"#,
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
                card_repository::CardRepository, extract_repository::ExtractRepository,
                folder_repository::FolderRepository, reading_repository::ReadingRepository,
            },
            value_objects::{
                card_parent::CardParent, element_id::ElementId, extract_parent::ExtractParent,
                meta::Meta,
            },
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
            position: 0,
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

        let parent = Folder {
            meta: make_meta(),
            parent_folder_id: None,
            tags: vec![],
        };
        let child = Folder {
            meta: make_meta(),
            parent_folder_id: Some(parent.meta.id),
            tags: vec![],
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

        let folder = Folder {
            meta: make_meta(),
            parent_folder_id: None,
            tags: vec![],
        };
        let extract = Extract {
            meta: make_meta(),
            parent: ExtractParent::Folder(folder.meta.id),
            tags: vec![],
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

        let folder = Folder {
            meta: make_meta(),
            parent_folder_id: None,
            tags: vec![],
        };
        let card = Card {
            meta: make_meta(),
            parent: CardParent::Folder(folder.meta.id),
            tags: vec![],
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

        let folder = Folder {
            meta: make_meta(),
            parent_folder_id: None,
            tags: vec![],
        };
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
}
