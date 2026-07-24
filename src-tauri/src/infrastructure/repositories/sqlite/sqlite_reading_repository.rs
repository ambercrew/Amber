use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::entities::reading::{Reading, ReadingSplit, ReadingSplitId, ReadingSplitMeta};
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::value_objects::read_point::ReadPoint;
use crate::infrastructure::repositories::sqlite::sqlite_rows::reading_row::ReadingRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;

#[derive(ScopeInjectable)]
pub struct SqliteReadingRepository {
    tx: Arc<DbTransaction>,
    meta_repository: Arc<dyn MetaRepository>,
}

#[async_trait]
impl ReadingRepository for SqliteReadingRepository {
    async fn create(
        &self,
        reading: Reading,
        splits: Vec<ReadingSplit>,
    ) -> Result<(), RepositoryError> {
        self.meta_repository.create_meta(&reading.meta).await?;

        let uuid = reading.meta.element_id.id();
        {
            let mut tx = self.tx.lock().await;
            let tx = tx.as_mut();
            sqlx::query!(
                "INSERT INTO readings (id, readpoint_split, readpoint_block, a_factor) VALUES ($1, $2, $3, $4)",
                uuid,
                reading.read_point.split,
                reading.read_point.block,
                reading.a_factor,
            )
            .execute(&mut *tx)
            .await?;

            for split in splits {
                sqlx::query!(
                    "INSERT INTO reading_splits (reading_id, seq, content) VALUES ($1, $2, $3)",
                    uuid,
                    split.seq,
                    split.content,
                )
                .execute(&mut *tx)
                .await?;
            }
        }
        Ok(())
    }

    async fn get_all(&self) -> Result<Vec<Reading>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            ReadingRow,
            r#"SELECT
                m.element_id as "id: _",
                m.name,
                m.position as "position: _",
                m.parent_id as "parent_id: _",
                m.parent_type,
                m.derived_from_id as "derived_from_id: _",
                m.derived_from_type,
                m.study_profile_id as "study_profile_id: _",
                m.source_id as "source_id: _",
                m.created_at as "created_at: _",
                m.modified_at as "modified_at: _",
                r.readpoint_split,
                r.readpoint_block,
                r.a_factor
            FROM readings r
            INNER JOIN meta m ON r.id = m.element_id
            ORDER BY m.position"#
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows.into_iter().map(Reading::from).collect::<Vec<_>>())
    }

    async fn get_by_id(&self, id: Uuid) -> Result<Reading, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            ReadingRow,
            r#"SELECT
                m.element_id as "id: _",
                m.name,
                m.position as "position: _",
                m.parent_id as "parent_id: _",
                m.parent_type,
                m.derived_from_id as "derived_from_id: _",
                m.derived_from_type,
                m.study_profile_id as "study_profile_id: _",
                m.source_id as "source_id: _",
                m.created_at as "created_at: _",
                m.modified_at as "modified_at: _",
                r.readpoint_split,
                r.readpoint_block,
                r.a_factor
            FROM readings r
            INNER JOIN meta m ON r.id = m.element_id
            WHERE r.id = $1"#,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        Ok(row.into())
    }

    async fn get_split_manifest(
        &self,
        reading_id: Uuid,
    ) -> Result<Vec<ReadingSplitMeta>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query!(
            r#"SELECT seq, LENGTH(content) as "char_count!: i64"
            FROM reading_splits
            WHERE reading_id = $1
            ORDER BY seq"#,
            reading_id
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| ReadingSplitMeta {
                seq: row.seq as u32,
                char_count: row.char_count as u32,
            })
            .collect())
    }

    async fn get_split_content(&self, split_id: ReadingSplitId) -> Result<String, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query!(
            "SELECT content FROM reading_splits WHERE reading_id = $1 AND seq = $2",
            split_id.reading_id,
            split_id.seq,
        )
        .fetch_one(&mut *tx)
        .await?;

        Ok(row.content)
    }

    async fn update_content(
        &self,
        split_id: ReadingSplitId,
        content: String,
    ) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "UPDATE reading_splits SET content = $1 WHERE reading_id = $2 AND seq = $3",
            content,
            split_id.reading_id,
            split_id.seq,
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn update_read_point(
        &self,
        reading_id: Uuid,
        read_point: ReadPoint,
    ) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "UPDATE readings SET readpoint_split = $1, readpoint_block = $2 WHERE id = $3",
            read_point.split,
            read_point.block,
            reading_id,
        )
        .execute(&mut *tx)
        .await?;
        Ok(())
    }

    async fn update_a_factor(
        &self,
        reading_id: Uuid,
        a_factor: f32,
    ) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(
            "UPDATE readings SET a_factor = $1 WHERE id = $2",
            a_factor,
            reading_id,
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
            entities::{card::Card, extract::Extract, folder::Folder, reading::Reading},
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

    fn make_meta(id: ElementId) -> Meta {
        Meta {
            element_id: id,
            name: "test".into(),
            parent: None,
            position: FractionalIndex::default(),
            study_profile_id: None,
            source_id: None,
            derived_from: None,
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
    fn extract_meta() -> Meta {
        make_meta(ElementId::Extract(Uuid::new_v4()))
    }
    fn card_meta() -> Meta {
        make_meta(ElementId::Card(Uuid::new_v4()))
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

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            a_factor: 1.2,
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            read_point: ReadPoint::default(),
        };
        let extract = Extract {
            a_factor: 1.2,
            meta: Meta {
                parent: Some(reading.meta.element_id),
                ..extract_meta()
            },
            content: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo
            .create(reading.clone(), Vec::new())
            .await
            .unwrap();
        extract_repo.create(extract.clone()).await.unwrap();

        // Act

        meta_repo.delete(reading.meta.element_id).await.unwrap();

        // Assert

        let remaining = extract_repo.get_all().await.unwrap();
        assert!(
            !remaining
                .iter()
                .any(|e| e.meta.element_id == extract.meta.element_id)
        );
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

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            a_factor: 1.2,
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            read_point: ReadPoint::default(),
        };
        let card = Card {
            meta: Meta {
                parent: Some(reading.meta.element_id),
                ..card_meta()
            },
            front: String::new(),
            back: String::new(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo
            .create(reading.clone(), Vec::new())
            .await
            .unwrap();
        card_repo.create(card.clone()).await.unwrap();

        // Act

        meta_repo.delete(reading.meta.element_id).await.unwrap();

        // Assert

        let remaining = card_repo.get_all().await.unwrap();
        assert!(
            !remaining
                .iter()
                .any(|c| c.meta.element_id == card.meta.element_id)
        );
    }

    #[tokio::test]
    async fn rename_reading_valid_name_updates_name() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            a_factor: 1.2,
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            read_point: ReadPoint::default(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo
            .create(reading.clone(), Vec::new())
            .await
            .unwrap();

        // Act

        meta_repo
            .rename(reading.meta.element_id, "renamed".into())
            .await
            .unwrap();

        // Assert

        let remaining = reading_repo.get_all().await.unwrap();
        let updated = remaining
            .iter()
            .find(|r| r.meta.element_id == reading.meta.element_id)
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

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            a_factor: 1.2,
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            read_point: ReadPoint::default(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo
            .create(reading.clone(), Vec::new())
            .await
            .unwrap();

        // Act

        let actual = meta_repo.exists(reading.meta.element_id).await.unwrap();

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

    #[tokio::test]
    async fn get_split_manifest_multiple_splits_returns_ordered_meta_with_char_counts() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            a_factor: 1.2,
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            read_point: ReadPoint::default(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo
            .create(
                reading.clone(),
                vec![
                    ReadingSplit {
                        seq: 1,
                        content: "abcd".into(),
                    },
                    ReadingSplit {
                        seq: 0,
                        content: "ab".into(),
                    },
                ],
            )
            .await
            .unwrap();

        // Act

        let actual = reading_repo
            .get_split_manifest(reading.meta.element_id.id())
            .await
            .unwrap();

        // Assert

        assert_eq!(
            vec![
                ReadingSplitMeta {
                    seq: 0,
                    char_count: 2,
                },
                ReadingSplitMeta {
                    seq: 1,
                    char_count: 4,
                },
            ],
            actual
        );
    }

    #[tokio::test]
    async fn get_split_content_existing_split_returns_content() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            a_factor: 1.2,
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            read_point: ReadPoint::default(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo
            .create(
                reading.clone(),
                vec![ReadingSplit {
                    seq: 0,
                    content: "hello world".into(),
                }],
            )
            .await
            .unwrap();

        // Act

        let actual = reading_repo
            .get_split_content(ReadingSplitId {
                reading_id: reading.meta.element_id.id(),
                seq: 0,
            })
            .await
            .unwrap();

        // Assert

        assert_eq!("hello world", actual);
    }

    #[tokio::test]
    async fn update_read_point_valid_reading_persists_read_point() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;

        let folder = Folder {
            meta: folder_meta(),
        };
        let reading = Reading {
            a_factor: 1.2,
            meta: Meta {
                parent: Some(folder.meta.element_id),
                ..reading_meta()
            },
            read_point: ReadPoint::default(),
        };
        folder_repo.create(folder).await.unwrap();
        reading_repo
            .create(reading.clone(), Vec::new())
            .await
            .unwrap();

        // Act

        reading_repo
            .update_read_point(
                reading.meta.element_id.id(),
                ReadPoint { split: 3, block: 7 },
            )
            .await
            .unwrap();

        // Assert

        let updated = reading_repo
            .get_by_id(reading.meta.element_id.id())
            .await
            .unwrap();
        assert_eq!(3, updated.read_point.split);
        assert_eq!(7, updated.read_point.block);
    }
}
