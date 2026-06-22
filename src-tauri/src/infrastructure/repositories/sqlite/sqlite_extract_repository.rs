use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    common::repository_error::RepositoryError,
    incremental_reading::{
        dto::cell_with_pending_extracts_dto::CellWithPendingExtractsDto,
        extracts::{
            entities::extract::{Extract, ExtractStatus},
            repositories::extract_repository::ExtractRepository,
        },
    },
    infrastructure::{
        repositories::sqlite::sqlite_rows::extract_row::ExtractRow,
        value_objects::db_transaction::DbTransaction,
    },
};

#[derive(ScopeInjectable)]
pub struct SqliteExtractRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl ExtractRepository for SqliteExtractRepository {
    async fn get_by_id(&self, id: Guid) -> Result<Option<Extract>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            ExtractRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                cell_id as "cell_id: _",
                status as "status: _"
            FROM extracts
            WHERE id = $1"#,
            id
        )
        .fetch_optional(&mut *tx)
        .await?;

        Ok(row.map(Extract::from))
    }

    async fn get_by_cell_id(&self, cell_id: Guid) -> Result<Vec<Extract>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            ExtractRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                cell_id as "cell_id: _",
                status as "status: _"
            FROM extracts
            WHERE cell_id = $1"#,
            cell_id
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows.into_iter().map(Extract::from).collect())
    }

    async fn count_by_cell_id_and_status(
        &self,
        cell_id: Guid,
        status: &ExtractStatus,
    ) -> Result<u32, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let status_str =
            serde_json::to_string(status).map_err(|e| RepositoryError::QueryFailed(Box::new(e)))?;

        let row = sqlx::query!(
            r#"SELECT COUNT(*) as count FROM extracts WHERE cell_id = $1 AND status = $2"#,
            cell_id,
            status_str
        )
        .fetch_one(&mut *tx)
        .await?;

        Ok(row.count as u32)
    }

    async fn get_cells_with_pending_extracts(
        &self,
    ) -> Result<Vec<CellWithPendingExtractsDto>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let pending_status = serde_json::to_string(&ExtractStatus::Pending)
            .map_err(|e| RepositoryError::QueryFailed(Box::new(e)))?;

        let rows = sqlx::query_as!(
            CellWithPendingExtractsDto,
            r#"SELECT
                e.cell_id as "cell_id: _",
                c.file_id as "file_id: _",
                s.title,
                COUNT(e.id) as "pending_count!: i64"
            FROM extracts e
            JOIN cells c ON c.id = e.cell_id
            JOIN incremental_reading_schedules s ON s.cell_id = e.cell_id
            WHERE e.status = $1
            GROUP BY e.cell_id, c.file_id, s.title
            ORDER BY COUNT(e.id) DESC"#,
            pending_status
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows)
    }

    async fn update(&self, extract: &Extract) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(
            r#"UPDATE extracts SET status = $1 WHERE id = $2"#,
            extract.status(),
            extract.id()
        )
        .execute(&mut *tx)
        .await?;

        Ok(())
    }

    async fn create(&self, extract: &Extract) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(
            r#"INSERT INTO extracts(
                id,
                created_date,
                modified_date,
                cell_id,
                status)
            VALUES ($1, datetime($2), datetime($3), $4, $5)"#,
            extract.id(),
            extract.created_date(),
            extract.modified_date(),
            extract.cell_id(),
            extract.status(),
        )
        .execute(&mut *tx)
        .await?;

        Ok(())
    }

    async fn delete_by_id(&self, id: Guid) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!("DELETE FROM extracts WHERE id = $1", id)
            .execute(&mut *tx)
            .await?;

        Ok(())
    }

    async fn get_all_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Extract>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            ExtractRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                cell_id as "cell_id: _",
                status as "status: _"
            FROM extracts
            WHERE modified_date >= datetime($1)"#,
            modified_date
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows.into_iter().map(Extract::from).collect())
    }

    async fn upsert_with_modified_date_if_modified_before(
        &self,
        extract: &Extract,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = extract.id();
        let created_date = extract.created_date();
        let cell_id = extract.cell_id();
        let status = extract.status();

        let result = sqlx::query!(
            r#"INSERT INTO extracts(
                id,
                cell_id,
                status,
                modified_date,
                created_date)
            VALUES ($1, $2, $3, datetime($4), datetime($5))
            ON CONFLICT(id) DO UPDATE SET
                cell_id = $2,
                status = $3,
                modified_date = datetime($4),
                created_date = datetime($5)
            WHERE modified_date <= datetime($4)
            "#,
            id,
            cell_id,
            status,
            modified_date,
            created_date
        )
        .execute(&mut *tx)
        .await;

        Ok(result?.rows_affected())
    }
}

#[cfg(test)]
pub mod tests {
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        cells::{
            entities::cell::CellType, repositories::cell_repository::CellRepository,
            test_utils::create_cell,
            value_objects::incremental_reading::IncrementalReadingPriority,
        },
        file_system::{
            entities::file::File, repositories::file_repository::FileRepository,
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        incremental_reading::scheduling::{
            entities::incremental_reading_schedule::IncrementalReadingSchedule,
            repositories::incremental_reading_schedule_repository::IncrementalReadingScheduleRepository,
        },
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::{
                sqlite_cell_repository::SqliteCellRepository,
                sqlite_file_repository::SqliteFileRepository,
                sqlite_incremental_reading_schedule_repository::SqliteIncrementalReadingScheduleRepository,
            },
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(
            injector,
            dyn IncrementalReadingScheduleRepository,
            SqliteIncrementalReadingScheduleRepository
        );
        injector
    }

    fn extract(cell_id: Guid, status: ExtractStatus) -> Extract {
        Extract::new_unchecked(Guid::new_v4(), Utc::now(), Utc::now(), cell_id, status)
    }

    #[tokio::test]
    pub async fn get_cells_with_pending_extracts_mixed_extracts_returns_cells_with_pending_ordered_by_count()
     {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let schedule_repository = scope
            .resolve::<dyn IncrementalReadingScheduleRepository>()
            .await;
        let extract_repository = scope.resolve::<dyn ExtractRepository>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let ir_content = r#"{"content":null,"title":null,"source":{"type":"url","url":"http://x"},"priority":"normal","completed":false}"#;
        let ir_cell = |index: u32| {
            create_cell(
                None,
                file.id(),
                ir_content.into(),
                CellType::IncrementalReading,
                index,
            )
        };

        // two_pending: 2 pending + 1 added; one_pending: 1 pending; none_pending: only added/dismissed.
        let two_pending = ir_cell(0);
        let one_pending = ir_cell(1);
        let none_pending = ir_cell(2);

        for cell in [&two_pending, &one_pending, &none_pending] {
            cell_repository.create(cell).await.unwrap();
            schedule_repository
                .create(&IncrementalReadingSchedule::new_unchecked(
                    Guid::new_v4(),
                    Utc::now(),
                    Utc::now(),
                    cell.id(),
                    IncrementalReadingPriority::Normal,
                    "title".into(),
                    Utc::now(),
                    false,
                    false,
                ))
                .await
                .unwrap();
        }

        for e in [
            extract(two_pending.id(), ExtractStatus::Pending),
            extract(two_pending.id(), ExtractStatus::Pending),
            extract(two_pending.id(), ExtractStatus::Added),
            extract(one_pending.id(), ExtractStatus::Pending),
            extract(none_pending.id(), ExtractStatus::Added),
            extract(none_pending.id(), ExtractStatus::Dismissed),
        ] {
            extract_repository.create(&e).await.unwrap();
        }

        scope.save_changes().await.unwrap();

        // Act

        let actual = extract_repository
            .get_cells_with_pending_extracts()
            .await
            .unwrap();

        // Assert

        let result: Vec<(Guid, i64)> = actual
            .iter()
            .map(|c| (c.cell_id, c.pending_count))
            .collect();
        assert_eq!(vec![(two_pending.id(), 2), (one_pending.id(), 1)], result);
    }
}
