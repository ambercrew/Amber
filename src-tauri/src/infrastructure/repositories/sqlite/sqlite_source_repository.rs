use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::infrastructure::repositories::sqlite::sqlite_rows::source_row::SourceRow;
use crate::infrastructure::value_objects::db_transaction::DbTransaction;
use crate::sources::entities::source::Source;
use crate::sources::repositories::source_repository::SourceRepository;

#[derive(ScopeInjectable)]
pub struct SqliteSourceRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl SourceRepository for SqliteSourceRepository {
    async fn create(&self, source: &Source) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(
            r#"INSERT INTO sources
                (id, created_at, modified_at, title, authors, publication_date, type, location)
            VALUES ($1, datetime($2), datetime($3), $4, $5, $6, $7, $8)"#,
            source.id,
            source.created_at,
            source.modified_at,
            source.title,
            source.authors,
            source.publication_date,
            source.source_type.as_str(),
            source.location,
        )
        .execute(&mut *tx)
        .await?;

        Ok(())
    }

    async fn update(&self, source: &Source) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(
            r#"UPDATE sources SET
                title = $1,
                authors = $2,
                publication_date = $3,
                type = $4,
                location = $5
            WHERE id = $6"#,
            source.title,
            source.authors,
            source.publication_date,
            source.source_type.as_str(),
            source.location,
            source.id,
        )
        .execute(&mut *tx)
        .await?;

        Ok(())
    }

    async fn delete(&self, id: Uuid) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        sqlx::query!(r#"DELETE FROM sources WHERE id = $1"#, id)
            .execute(&mut *tx)
            .await?;
        Ok(())
    }

    async fn get_by_id(&self, id: Uuid) -> Result<Source, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            SourceRow,
            r#"SELECT
                id as "id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                title,
                authors,
                publication_date,
                type as "source_type: _",
                location
            FROM sources
            WHERE id = $1"#,
            id
        )
        .fetch_one(&mut *tx)
        .await?;

        Ok(row.into())
    }

    async fn get_all(&self) -> Result<Vec<Source>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            SourceRow,
            r#"SELECT
                id as "id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                title,
                authors,
                publication_date,
                type as "source_type: _",
                location
            FROM sources
            ORDER BY title"#
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows.into_iter().map(|row| row.into()).collect())
    }

    async fn find_by_location(&self, location: &str) -> Result<Option<Source>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            SourceRow,
            r#"SELECT
                id as "id: _",
                created_at as "created_at: _",
                modified_at as "modified_at: _",
                title,
                authors,
                publication_date,
                type as "source_type: _",
                location
            FROM sources
            WHERE location = $1
            LIMIT 1"#,
            location
        )
        .fetch_optional(&mut *tx)
        .await?;

        Ok(row.map(|row| row.into()))
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};

    use crate::sources::value_objects::source_type::SourceType;
    use crate::test_utils::create_test_injector;

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn SourceRepository, SqliteSourceRepository);
        injector
    }

    fn make_source(location: Option<&str>) -> Source {
        let now = Utc::now();
        Source {
            id: Uuid::new_v4(),
            created_at: now,
            modified_at: now,
            title: "test".into(),
            authors: None,
            publication_date: None,
            source_type: SourceType::WebPage,
            location: location.map(|l| l.to_string()),
        }
    }

    #[tokio::test]
    async fn create_and_get_by_id_valid_source_returns_same_source() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let repo = scope.resolve::<dyn SourceRepository>().await;
        let source = make_source(Some("https://example.com"));

        // Act

        repo.create(&source).await.unwrap();
        let actual = repo.get_by_id(source.id).await.unwrap();

        // Assert

        assert_eq!(source.id, actual.id);
        assert_eq!(source.location, actual.location);
    }

    #[tokio::test]
    async fn update_existing_source_changes_fields() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let repo = scope.resolve::<dyn SourceRepository>().await;
        let source = make_source(None);
        repo.create(&source).await.unwrap();

        // Act

        let updated = Source {
            title: "renamed".into(),
            ..source.clone()
        };
        repo.update(&updated).await.unwrap();
        let actual = repo.get_by_id(source.id).await.unwrap();

        // Assert

        assert_eq!("renamed", actual.title);
    }

    #[tokio::test]
    async fn find_by_location_matching_location_returns_source() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let repo = scope.resolve::<dyn SourceRepository>().await;
        let source = make_source(Some("https://example.com"));
        repo.create(&source).await.unwrap();

        // Act

        let actual = repo.find_by_location("https://example.com").await.unwrap();

        // Assert

        assert_eq!(Some(source.id), actual.map(|s| s.id));
    }

    #[tokio::test]
    async fn find_by_location_no_match_returns_none() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let repo = scope.resolve::<dyn SourceRepository>().await;

        // Act

        let actual = repo.find_by_location("https://none.com").await.unwrap();

        // Assert

        assert!(actual.is_none());
    }
}
