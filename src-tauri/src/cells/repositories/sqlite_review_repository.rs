use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;
use tokio::sync::Mutex;

use crate::{
    cells::{
        entities::review::Review,
        repositories::{
            sqlite_review_repository::review_row::ReviewRow,
            traits::review_repository::ReviewRepository,
        },
    },
    common::{DbTransaction, repository_error::RepositoryError},
};

#[derive(ScopeInjectable)]
pub struct SqliteReviewRepository {
    tx: Arc<Mutex<DbTransaction>>,
}

#[async_trait]
impl ReviewRepository for SqliteReviewRepository {
    async fn create(&self, review: &Review) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let Review {
            id,
            created_date,
            modified_date,
            cell_id,
            study_time,
            date,
            rating,
        } = review;

        let result = sqlx::query!(
            r#"INSERT INTO reviews(
                id,
                created_date,
                modified_date,
                cell_id,
                study_time,
                date,
                rating)
            VALUES ($1, datetime($2), datetime($3), $4, $5, $6, $7)"#,
            id,
            created_date,
            modified_date,
            cell_id,
            study_time,
            date,
            rating
        )
        .execute(&mut *tx)
        .await;

        match result {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(_) => Ok(()),
        }
    }

    async fn get_all_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Review>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            ReviewRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                cell_id as "cell_id: _",
                study_time as "study_time: _",
                date as "date: _",
                rating as "rating: _"
            FROM reviews
            WHERE modified_date >= datetime($1)"#,
            modified_date
        )
        .fetch_all(&mut *tx)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => Ok(rows.into_iter().map(|row| row.into()).collect()),
        }
    }

    async fn upsert_with_modified_date_if_modified_before(
        &self,
        review: &Review,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = review.id();
        let cell_id = review.cell_id();
        let study_time = review.study_time();
        let date = review.date();
        let rating = review.rating();
        let created_date = review.created_date();

        let result = sqlx::query!(
            r#"INSERT INTO reviews(
                id,
                cell_id,
                study_time,
                date,
                rating,
                modified_date,
                created_date) 
            VALUES ($1, $2, $3, $4, $5, datetime($6), datetime($7))
            ON CONFLICT(id) DO UPDATE SET
                id = $1,
                cell_id = $2,
                study_time = $3,
                date = $4,
                rating = $5,
                modified_date = datetime($6),
                created_date = datetime($7)
            WHERE modified_date <= datetime($6)
            "#,
            id,
            cell_id,
            study_time,
            date,
            rating,
            modified_date,
            created_date
        )
        .execute(&mut *tx)
        .await;

        match result {
            Ok(result) => Ok(result.rows_affected()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }
}

mod review_row {
    use chrono::{DateTime, Utc};

    use crate::{Guid, cells::entities::review::Rating};

    use super::*;

    pub(super) struct ReviewRow {
        pub id: Guid,
        pub created_date: DateTime<Utc>,
        pub modified_date: DateTime<Utc>,
        pub cell_id: Option<Guid>,
        pub study_time: u32,
        pub date: DateTime<Utc>,
        pub rating: Rating,
    }

    impl From<ReviewRow> for Review {
        fn from(value: ReviewRow) -> Self {
            Review::new_unchecked(
                value.id,
                value.created_date,
                value.modified_date,
                value.cell_id,
                value.study_time,
                value.date,
                value.rating,
            )
        }
    }
}
