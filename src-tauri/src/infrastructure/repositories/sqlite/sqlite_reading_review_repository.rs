use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::value_objects::element_id::ElementId;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;
use crate::study::entities::reading_review::ReadingReview;
use crate::study::repositories::reading_review_repository::ReadingReviewRepository;

#[derive(ScopeInjectable)]
pub struct SqliteReadingReviewRepository {
    tx: Arc<DbTransaction>,
}

fn element_id_from_type(id: Uuid, element_type: &str) -> ElementId {
    match element_type {
        "extract" => ElementId::Extract(id),
        _ => ElementId::Reading(id),
    }
}

#[async_trait]
impl ReadingReviewRepository for SqliteReadingReviewRepository {
    async fn get_by_element_id(
        &self,
        element_id: Uuid,
    ) -> Result<Option<ReadingReview>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query!(
            r#"SELECT
                m.element_id as "element_id: uuid::Uuid",
                m.element_type,
                rr.due as "due: DateTime<Utc>",
                rr.interval_days,
                rr.last_reviewed as "last_reviewed: DateTime<Utc>",
                rr.finished_at as "finished_at: DateTime<Utc>"
            FROM reading_reviews rr
            INNER JOIN meta m ON m.element_id = rr.element_id
            WHERE rr.element_id = $1"#,
            element_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        Ok(row.map(|row| ReadingReview {
            element_id: element_id_from_type(row.element_id, &row.element_type),
            due: row.due,
            interval_days: row.interval_days as f32,
            last_reviewed: row.last_reviewed,
            finished_at: row.finished_at,
        }))
    }

    async fn upsert(&self, review: &ReadingReview) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let element_id = review.element_id.id();

        sqlx::query!(
            r#"INSERT INTO reading_reviews
                (element_id, due, interval_days, last_reviewed, finished_at)
            VALUES ($1, datetime($2), $3, datetime($4), datetime($5))
            ON CONFLICT (element_id) DO UPDATE SET
                due = excluded.due,
                interval_days = excluded.interval_days,
                last_reviewed = excluded.last_reviewed,
                finished_at = excluded.finished_at"#,
            element_id,
            review.due,
            review.interval_days,
            review.last_reviewed,
            review.finished_at,
        )
        .execute(&mut *tx)
        .await?;

        Ok(())
    }

    async fn get_due_element_ids(
        &self,
        as_of: DateTime<Utc>,
    ) -> Result<Vec<ElementId>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query!(
            r#"SELECT m.element_id as "element_id: uuid::Uuid", m.element_type
            FROM meta m
            LEFT JOIN reading_reviews rr ON rr.element_id = m.element_id
            WHERE m.element_type IN ('reading', 'extract')
              AND (rr.element_id IS NULL OR (rr.finished_at IS NULL AND rr.due <= datetime($1)))"#,
            as_of
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows
            .into_iter()
            .map(|row| element_id_from_type(row.element_id, &row.element_type))
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use chrono::Duration;
    use fractional_index::FractionalIndex;
    use injector::{injector::Injector, register_scope};

    use crate::{
        elements::{
            entities::{extract::Extract, reading::Reading},
            repositories::{
                extract_repository::ExtractRepository, meta_repository::MetaRepository,
                reading_repository::ReadingRepository,
            },
            value_objects::meta::Meta,
        },
        infrastructure::repositories::sqlite::{
            sqlite_extract_repository::SqliteExtractRepository,
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_reading_repository::SqliteReadingRepository,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(
            injector,
            dyn ReadingReviewRepository,
            SqliteReadingReviewRepository
        );
        injector
    }

    fn make_meta(id: ElementId) -> Meta {
        Meta {
            element_id: id,
            name: "test".into(),
            parent: None,
            position: FractionalIndex::default(),
            study_profile_id: None,
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    fn make_review(element_id: ElementId) -> ReadingReview {
        ReadingReview {
            element_id,
            due: Utc::now(),
            interval_days: 1.0,
            last_reviewed: Some(Utc::now()),
            finished_at: None,
        }
    }

    #[tokio::test]
    async fn upsert_and_get_by_element_id_reading_returns_same_review() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let repo = scope.resolve::<dyn ReadingReviewRepository>().await;
        let reading_id = ElementId::Reading(Uuid::new_v4());
        reading_repo
            .create(
                Reading {
                    a_factor: 1.2,
                    meta: make_meta(reading_id),
                    position_split: 0,
                    position_block: 0,
                },
                Vec::new(),
            )
            .await
            .unwrap();
        let review = make_review(reading_id);

        // Act

        repo.upsert(&review).await.unwrap();
        let actual = repo
            .get_by_element_id(reading_id.id())
            .await
            .unwrap()
            .unwrap();

        // Assert

        assert_eq!(reading_id, actual.element_id);
        assert_eq!(review.interval_days, actual.interval_days);
    }

    #[tokio::test]
    async fn get_due_element_ids_new_overdue_and_finished_returns_only_due() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let extract_repo = scope.resolve::<dyn ExtractRepository>().await;
        let repo = scope.resolve::<dyn ReadingReviewRepository>().await;

        let new_reading_id = ElementId::Reading(Uuid::new_v4());
        reading_repo
            .create(
                Reading {
                    a_factor: 1.2,
                    meta: make_meta(new_reading_id),
                    position_split: 0,
                    position_block: 0,
                },
                Vec::new(),
            )
            .await
            .unwrap();

        let overdue_extract_id = ElementId::Extract(Uuid::new_v4());
        extract_repo
            .create(Extract {
                a_factor: 1.2,
                meta: make_meta(overdue_extract_id),
                content: String::new(),
            })
            .await
            .unwrap();
        repo.upsert(&ReadingReview {
            due: Utc::now() - Duration::days(1),
            ..make_review(overdue_extract_id)
        })
        .await
        .unwrap();

        let finished_reading_id = ElementId::Reading(Uuid::new_v4());
        reading_repo
            .create(
                Reading {
                    a_factor: 1.2,
                    meta: make_meta(finished_reading_id),
                    position_split: 0,
                    position_block: 0,
                },
                Vec::new(),
            )
            .await
            .unwrap();
        repo.upsert(&ReadingReview {
            due: Utc::now() - Duration::days(1),
            finished_at: Some(Utc::now()),
            ..make_review(finished_reading_id)
        })
        .await
        .unwrap();

        // Act

        let due_ids = repo.get_due_element_ids(Utc::now()).await.unwrap();

        // Assert

        assert!(due_ids.contains(&new_reading_id));
        assert!(due_ids.contains(&overdue_extract_id));
        assert!(!due_ids.contains(&finished_reading_id));
    }
}
