use std::sync::Arc;

use async_trait::async_trait;
use sqlx::{Sqlite, Transaction};
use tokio::sync::Mutex;

use crate::{
    cells::{entities::review::Review, repositories::traits::review_repository::ReviewRepository},
    common::repository_error::RepositoryError,
};

pub struct SqliteReviewRepository {
    tx: Arc<Mutex<Transaction<'static, Sqlite>>>,
}

impl SqliteReviewRepository {
    pub fn new(tx: Arc<Mutex<Transaction<'static, Sqlite>>>) -> Self {
        Self { tx }
    }
}

#[async_trait]
impl ReviewRepository for SqliteReviewRepository {
    async fn create(&self, review: &Review) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let Review {
            id,
            cell_id,
            study_time,
            date,
            rating,
        } = review;

        let result = sqlx::query!(
            r#"INSERT INTO
                reviews(id, cell_id, study_time, date, rating)
                VALUES ($1, $2, $3, $4, $5)"#,
            id,
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
}
