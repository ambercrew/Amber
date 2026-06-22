use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    common::repository_error::RepositoryError,
    incremental_reading::dto::due_incremental_reading_dto::DueIncrementalReadingDto,
    incremental_reading::scheduling::{
        entities::incremental_reading_schedule::IncrementalReadingSchedule,
        repositories::incremental_reading_schedule_repository::IncrementalReadingScheduleRepository,
    },
    infrastructure::{
        repositories::sqlite::sqlite_rows::incremental_reading_schedule_row::IncrementalReadingScheduleRow,
        value_objects::db_transaction::DbTransaction,
    },
};

#[derive(ScopeInjectable)]
pub struct SqliteIncrementalReadingScheduleRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl IncrementalReadingScheduleRepository for SqliteIncrementalReadingScheduleRepository {
    async fn get_by_cell_id(
        &self,
        cell_id: Guid,
    ) -> Result<Option<IncrementalReadingSchedule>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_as!(
            IncrementalReadingScheduleRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                cell_id as "cell_id: _",
                priority as "priority: _",
                title,
                next_reading_date as "next_reading_date: _",
                completed as "completed: _",
                has_extracts as "has_extracts: _"
            FROM incremental_reading_schedules
            WHERE cell_id = $1"#,
            cell_id
        )
        .fetch_optional(&mut *tx)
        .await?;

        Ok(row.map(IncrementalReadingSchedule::from))
    }

    async fn create(&self, schedule: &IncrementalReadingSchedule) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(
            r#"INSERT INTO incremental_reading_schedules(
                id,
                created_date,
                modified_date,
                cell_id,
                priority,
                title,
                next_reading_date,
                completed,
                has_extracts)
            VALUES ($1, datetime($2), datetime($3), $4, $5, $6, datetime($7), $8, $9)"#,
            schedule.id(),
            schedule.created_date(),
            schedule.modified_date(),
            schedule.cell_id(),
            schedule.priority(),
            schedule.title(),
            schedule.next_reading_date(),
            schedule.completed(),
            schedule.has_extracts(),
        )
        .execute(&mut *tx)
        .await?;

        Ok(())
    }

    async fn get_due_ordered_by_priority_then_extracts(
        &self,
        before: DateTime<Utc>,
    ) -> Result<Vec<DueIncrementalReadingDto>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            DueIncrementalReadingDto,
            r#"SELECT
                s.cell_id as "cell_id: _",
                c.file_id as "file_id: _",
                s.title,
                s.priority as "priority: _",
                s.has_extracts as "has_extracts: _"
            FROM incremental_reading_schedules s
            JOIN cells c ON c.id = s.cell_id
            WHERE s.next_reading_date < datetime($1)
                AND s.completed = 0
            ORDER BY
                CASE s.priority
                    WHEN '"high"' THEN 0
                    WHEN '"normal"' THEN 1
                    WHEN '"low"' THEN 2
                    ELSE 3
                END,
                s.has_extracts DESC,
                s.next_reading_date"#,
            before
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows)
    }

    async fn update(&self, schedule: &IncrementalReadingSchedule) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        sqlx::query!(
            r#"UPDATE incremental_reading_schedules
            SET priority = $1,
                title = $2,
                next_reading_date = datetime($3),
                completed = $4,
                has_extracts = $5
            WHERE id = $6"#,
            schedule.priority(),
            schedule.title(),
            schedule.next_reading_date(),
            schedule.completed(),
            schedule.has_extracts(),
            schedule.id(),
        )
        .execute(&mut *tx)
        .await?;

        Ok(())
    }

    async fn get_all_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<IncrementalReadingSchedule>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            IncrementalReadingScheduleRow,
            r#"SELECT
                id as "id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                cell_id as "cell_id: _",
                priority as "priority: _",
                title,
                next_reading_date as "next_reading_date: _",
                completed as "completed: _",
                has_extracts as "has_extracts: _"
            FROM incremental_reading_schedules
            WHERE modified_date >= datetime($1)"#,
            modified_date
        )
        .fetch_all(&mut *tx)
        .await?;

        Ok(rows
            .into_iter()
            .map(IncrementalReadingSchedule::from)
            .collect())
    }

    async fn upsert_with_modified_date_if_modified_before(
        &self,
        schedule: &IncrementalReadingSchedule,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = schedule.id();
        let created_date = schedule.created_date();
        let cell_id = schedule.cell_id();
        let priority = schedule.priority();
        let title = schedule.title();
        let next_reading_date = schedule.next_reading_date();
        let completed = schedule.completed();
        let has_extracts = schedule.has_extracts();

        let result = sqlx::query!(
            r#"INSERT INTO incremental_reading_schedules(
                id,
                cell_id,
                priority,
                title,
                next_reading_date,
                completed,
                has_extracts,
                modified_date,
                created_date)
            VALUES ($1, $2, $3, $4, datetime($5), $6, $7, datetime($8), datetime($9))
            ON CONFLICT(id) DO UPDATE SET
                cell_id = $2,
                priority = $3,
                title = $4,
                next_reading_date = datetime($5),
                completed = $6,
                has_extracts = $7,
                modified_date = datetime($8),
                created_date = datetime($9)
            WHERE modified_date <= datetime($8)
            "#,
            id,
            cell_id,
            priority,
            title,
            next_reading_date,
            completed,
            has_extracts,
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
    use chrono::Duration;
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
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::{
                sqlite_cell_repository::SqliteCellRepository,
                sqlite_file_repository::SqliteFileRepository,
            },
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(
            injector,
            dyn IncrementalReadingScheduleRepository,
            SqliteIncrementalReadingScheduleRepository
        );
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        injector
    }

    fn schedule(
        cell_id: Guid,
        priority: IncrementalReadingPriority,
        title: &str,
        next_reading_date: DateTime<Utc>,
        completed: bool,
        has_extracts: bool,
    ) -> IncrementalReadingSchedule {
        IncrementalReadingSchedule::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            cell_id,
            priority,
            title.into(),
            next_reading_date,
            completed,
            has_extracts,
        )
    }

    #[tokio::test]
    pub async fn get_due_ordered_by_priority_then_extracts_mixed_schedules_returns_due_ordered_by_priority_then_extracts()
     {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let schedule_repository = scope
            .resolve::<dyn IncrementalReadingScheduleRepository>()
            .await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let now = Utc::now();
        let past = now - Duration::days(1);
        let future = now + Duration::days(1);

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

        // Due readings with different priorities (created out of order), plus a
        // normal-priority reading with extracts that should outrank the plain one.
        let due_normal = ir_cell(0);
        let due_normal_with_extracts = ir_cell(1);
        let due_high = ir_cell(2);
        let due_low = ir_cell(3);
        // Excluded: scheduled in the future, completed, finished.
        let future_cell = ir_cell(4);
        let completed_cell = ir_cell(5);
        let finished_cell = ir_cell(6);

        for cell in [
            &due_normal,
            &due_normal_with_extracts,
            &due_high,
            &due_low,
            &future_cell,
            &completed_cell,
            &finished_cell,
        ] {
            cell_repository.create(cell).await.unwrap();
        }

        for s in [
            schedule(
                due_normal.id(),
                IncrementalReadingPriority::Normal,
                "normal",
                past,
                false,
                false,
            ),
            schedule(
                due_normal_with_extracts.id(),
                IncrementalReadingPriority::Normal,
                "normal-with-extracts",
                past,
                false,
                true,
            ),
            schedule(
                due_high.id(),
                IncrementalReadingPriority::High,
                "high",
                past,
                false,
                false,
            ),
            schedule(
                due_low.id(),
                IncrementalReadingPriority::Low,
                "low",
                past,
                false,
                false,
            ),
            schedule(
                future_cell.id(),
                IncrementalReadingPriority::High,
                "future",
                future,
                false,
                false,
            ),
            schedule(
                completed_cell.id(),
                IncrementalReadingPriority::High,
                "completed",
                past,
                true,
                false,
            ),
            schedule(
                finished_cell.id(),
                IncrementalReadingPriority::High,
                "finished",
                past,
                true,
                false,
            ),
        ] {
            schedule_repository.create(&s).await.unwrap();
        }

        scope.save_changes().await.unwrap();

        // Act

        let actual = schedule_repository
            .get_due_ordered_by_priority_then_extracts(now)
            .await
            .unwrap();

        // Assert

        let titles: Vec<&str> = actual.iter().map(|r| r.title.as_str()).collect();
        assert_eq!(
            vec!["high", "normal-with-extracts", "normal", "low"],
            titles
        );
    }
}
