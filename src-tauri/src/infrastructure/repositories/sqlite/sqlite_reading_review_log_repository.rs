use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::common::repository_error::RepositoryError;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;
use crate::study::entities::reading_review_log::ReadingReviewLog;
use crate::study::repositories::reading_review_log_repository::ReadingReviewLogRepository;

#[derive(ScopeInjectable)]
pub struct SqliteReadingReviewLogRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl ReadingReviewLogRepository for SqliteReadingReviewLogRepository {
    async fn create(&self, log: &ReadingReviewLog) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let action = log.action.as_str();

        sqlx::query!(
            r#"INSERT INTO reading_review_logs (id, element_id, reviewed_at, action)
            VALUES ($1, $2, datetime($3), $4)"#,
            log.id,
            log.element_id,
            log.reviewed_at,
            action,
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
            entities::reading::Reading,
            repositories::{
                meta_repository::MetaRepository, reading_repository::ReadingRepository,
            },
            value_objects::{element_id::ElementId, meta::Meta},
        },
        infrastructure::repositories::sqlite::{
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_reading_repository::SqliteReadingRepository,
        },
        study::value_objects::reading_action::ReadingAction,
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(
            injector,
            dyn ReadingReviewLogRepository,
            SqliteReadingReviewLogRepository
        );
        injector
    }

    #[tokio::test]
    async fn create_valid_log_succeeds() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        let repo = scope.resolve::<dyn ReadingReviewLogRepository>().await;
        let element_id = Uuid::new_v4();
        reading_repo
            .create(Reading {
                a_factor: 1.2,
                meta: Meta {
                    element_id: ElementId::Reading(element_id),
                    name: "test".into(),
                    parent: None,
                    position: FractionalIndex::default(),
                    study_profile_id: None,
                    created_at: Utc::now(),
                    modified_at: Utc::now(),
                },
                content: String::new(),
                position_block_index: 0,
            })
            .await
            .unwrap();
        let log = ReadingReviewLog {
            id: Uuid::new_v4(),
            element_id: Some(element_id),
            reviewed_at: Utc::now(),
            action: ReadingAction::Next,
        };

        // Act

        let result = repo.create(&log).await;

        // Assert

        assert!(result.is_ok());
    }
}
