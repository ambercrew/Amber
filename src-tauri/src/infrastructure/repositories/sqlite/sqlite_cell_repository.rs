use std::{collections::HashMap, sync::Arc};

use async_trait::async_trait;
use chrono::{DateTime, Datelike, NaiveDate, NaiveTime, Utc};
use injector_derive::ScopeInjectable;
use sqlx::{QueryBuilder, SqliteConnection};

use crate::{
    Guid,
    cells::{
        entities::{
            cell::Cell,
            repetition::{Repetition, State},
        },
        repositories::cell_repository::{CellDeletionRequest, CellRepository, MoveDirection},
        value_objects::{
            file_repetitions_count::FileRepetitionCounts, home_statistics::HomeStatistics,
        },
    },
    common::repository_error::RepositoryError,
    infrastructure::{
        repositories::sqlite::sqlite_rows::{
            cell_row::{CellRow, convert_rows_to_cells},
            repetition_row::RepetitionRow,
        },
        value_objects::db_transaction::DbTransaction,
    },
};

#[derive(ScopeInjectable)]
pub struct SqliteCellRepository {
    tx: Arc<DbTransaction>,
}

#[async_trait]
impl CellRepository for SqliteCellRepository {
    async fn get_by_id(&self, id: Guid) -> Result<Cell, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            CellRow,
            r#"SELECT
                cell.id as "cell_id: _",
                cell.created_date as "cell_created_date: _",
                cell.modified_date as "cell_modified_date: _",
                cell.file_id as "cell_file_id: _",
                cell.content as cell_content,
                cell.cell_index as "cell_index: _",
                cell.cell_type as "cell_type: _",
                cell.searchable_content as cell_searchable_content,

                repetition.id as "repetition_id: _",
                repetition.created_date as "repetition_created_date: _",
                repetition.modified_date as "repetition_modified_date: _",
                repetition.file_id as "repetition_file_id: _",
                repetition.cell_id as "repetition_cell_id: _",
                repetition.due as "repetition_due: _",
                repetition.stability as "repetition_stability: _",
                repetition.difficulty as "repetition_difficulty: _",
                repetition.learning_steps as "repetition_learning_steps: _",
                repetition.scheduled_days as "repetition_scheduled_days",
                repetition.reps as "repetition_reps: _",
                repetition.lapses as "repetition_lapses: _",
                repetition.state as "repetition_state: _",
                repetition.last_review as "repetition_last_review: _",
                repetition.additional_content as "repetition_additional_content: _"

            FROM cells As cell
            LEFT JOIN repetitions AS repetition ON repetition.cell_id = cell.id
            WHERE cell.id = $1"#,
            id
        )
        .fetch_all(&mut *tx)
        .await;

        let rows = rows?;
        convert_rows_to_cells(rows)
            .into_iter()
            .next()
            .ok_or_else(|| RepositoryError::NotFound(format!("Cell not found: {id}").into()))
            .map(Ok)?
    }

    async fn get_number_of_cells_in_file_with_index(
        &self,
        file_id: Guid,
        index: u32,
    ) -> Result<u32, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_scalar!(
            r#"SELECT COUNT(*) FROM cells WHERE file_id = $1 AND cell_index = $2"#,
            file_id,
            index
        )
        .fetch_one(&mut *tx)
        .await;

        Ok(row? as u32)
    }

    async fn get_number_of_cells_in_file(&self, file_id: Guid) -> Result<u32, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query_scalar!(r#"SELECT COUNT(*) FROM cells WHERE file_id = $1"#, file_id,)
            .fetch_one(&mut *tx)
            .await;

        Ok(row? as u32)
    }

    async fn get_file_cells_ordered_by_index(
        &self,
        file_id: Guid,
    ) -> Result<Vec<Cell>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            CellRow,
            r#"SELECT
                cell.id as "cell_id: _",
                cell.created_date as "cell_created_date: _",
                cell.modified_date as "cell_modified_date: _",
                cell.file_id as "cell_file_id: _",
                cell.content as cell_content,
                cell.cell_index as "cell_index: _",
                cell.cell_type as "cell_type: _",
                cell.searchable_content as cell_searchable_content,

                repetition.id as "repetition_id: _",
                repetition.created_date as "repetition_created_date: _",
                repetition.modified_date as "repetition_modified_date: _",
                repetition.file_id as "repetition_file_id: _",
                repetition.cell_id as "repetition_cell_id: _",
                repetition.due as "repetition_due: _",
                repetition.stability as "repetition_stability: _",
                repetition.difficulty as "repetition_difficulty: _",
                repetition.learning_steps as "repetition_learning_steps: _",
                repetition.scheduled_days as "repetition_scheduled_days",
                repetition.reps as "repetition_reps: _",
                repetition.lapses as "repetition_lapses: _",
                repetition.state as "repetition_state: _",
                repetition.last_review as "repetition_last_review: _",
                repetition.additional_content as "repetition_additional_content: _"

            FROM cells As cell
            LEFT JOIN repetitions AS repetition ON repetition.cell_id = cell.id

            WHERE cell.file_id = $1
            ORDER BY cell.cell_index"#,
            file_id
        )
        .fetch_all(&mut *tx)
        .await;

        let cells = convert_rows_to_cells(rows?);
        Ok(cells)
    }

    async fn get_all_cells_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Cell>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            CellRow,
            r#"SELECT
                cell.id as "cell_id: _",
                cell.created_date as "cell_created_date: _",
                cell.modified_date as "cell_modified_date: _",
                cell.file_id as "cell_file_id: _",
                cell.content as cell_content,
                cell.cell_index as "cell_index: _",
                cell.cell_type as "cell_type: _",
                cell.searchable_content as cell_searchable_content,

                repetition.id as "repetition_id: _",
                repetition.created_date as "repetition_created_date: _",
                repetition.modified_date as "repetition_modified_date: _",
                repetition.file_id as "repetition_file_id: _",
                repetition.cell_id as "repetition_cell_id: _",
                repetition.due as "repetition_due: _",
                repetition.stability as "repetition_stability: _",
                repetition.difficulty as "repetition_difficulty: _",
                repetition.learning_steps as "repetition_learning_steps: _",
                repetition.scheduled_days as "repetition_scheduled_days",
                repetition.reps as "repetition_reps: _",
                repetition.lapses as "repetition_lapses: _",
                repetition.state as "repetition_state: _",
                repetition.last_review as "repetition_last_review: _",
                repetition.additional_content as "repetition_additional_content: _"

            FROM cells As cell
            LEFT JOIN repetitions AS repetition ON repetition.cell_id = cell.id
            WHERE cell.modified_date >= datetime($1)"#,
            modified_date
        )
        .fetch_all(&mut *tx)
        .await;

        let cells = convert_rows_to_cells(rows?);
        Ok(cells)
    }

    async fn get_all_repetitions_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Repetition>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let rows = sqlx::query_as!(
            RepetitionRow,
            r#"SELECT
                id as "id: _",
                file_id as "file_id: _",
                created_date as "created_date: _",
                modified_date as "modified_date: _",
                cell_id as "cell_id: _",
                due as "due: _",
                stability as "stability: _",
                difficulty as "difficulty: _",
                learning_steps as "learning_steps: _",
                scheduled_days as "scheduled_days",
                reps as "reps: _",
                lapses as "lapses: _",
                state as "state: _",
                last_review as "last_review: _",
                additional_content as "additional_content: _"

            FROM repetitions
            WHERE modified_date >= datetime($1)"#,
            modified_date
        )
        .fetch_all(&mut *tx)
        .await;

        let result = rows?.into_iter().map(|row| row.into()).collect::<Vec<_>>();
        Ok(result)
    }

    async fn create(&self, cell: &Cell) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = cell.id();
        let content = cell.content();
        let cell_type = cell.cell_type();
        let file_id = cell.file_id();
        let index = cell.index();
        let searchable_content = cell.searchable_content();
        let created_date = cell.created_date();
        let modified_date = cell.modified_date();

        let result = sqlx::query!(
            r#"INSERT INTO cells(
                id,
                created_date,
                modified_date,
                content,
                cell_type,
                cell_index,
                file_id,
                searchable_content)
            VALUES ($1, datetime($2), datetime($3), $4, $5, $6, $7, $8)"#,
            id,
            created_date,
            modified_date,
            content,
            cell_type,
            index,
            file_id,
            searchable_content
        )
        .execute(&mut *tx)
        .await;

        result?;

        upsert_repetitions(tx, cell.repetitions()).await
    }

    async fn update(&self, cell: &Cell) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = cell.id();
        let content = cell.content();
        let cell_type = cell.cell_type();
        let file_id = cell.file_id();
        let index = cell.index();
        let searchable_content = cell.searchable_content();
        let created_date = cell.created_date();
        let modified_date = cell.modified_date();

        let result = sqlx::query!(
            r#"UPDATE cells
                SET id = $1,
                    created_date = datetime($2),
                    modified_date = datetime($3),
                    file_id = $4,
                    content = $5,
                    cell_type = $6,
                    cell_index = $7,
                    searchable_content = $8
                WHERE id = $1"#,
            id,
            created_date,
            modified_date,
            file_id,
            content,
            cell_type,
            index,
            searchable_content
        )
        .execute(&mut *tx)
        .await;

        result?;

        // Deleting removed repetitions.

        let mut query_builder: QueryBuilder<sqlx::Sqlite> =
            QueryBuilder::new("DELETE FROM repetitions WHERE cell_id = ");
        query_builder.push_bind(id);
        query_builder.push(" AND id NOT IN (");
        let mut separated = query_builder.separated(",");
        for repetition in cell.repetitions() {
            separated.push_bind(repetition.id());
        }
        separated.push_unseparated(")");

        query_builder.build().execute(&mut *tx).await?;

        upsert_repetitions(tx, cell.repetitions()).await
    }

    async fn upsert_cell_without_repetition_and_with_modified_date_if_modified_before(
        &self,
        cell: &Cell,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();
        let id = cell.id();
        let content = cell.content();
        let cell_type = cell.cell_type();
        let file_id = cell.file_id();
        let index = cell.index();
        let searchable_content = cell.searchable_content();
        let created_date = cell.created_date();

        let result = sqlx::query!(
            r#"INSERT INTO cells(
                id,
                file_id,
                content,
                cell_type,
                cell_index,
                searchable_content,
                modified_date,
                created_date)
            VALUES ($1, $2, $3, $4, $5, $6, datetime($7), datetime($8))
            ON CONFLICT(id) DO UPDATE
            SET id = $1,
                file_id = $2,
                content = $3,
                cell_type = $4,
                cell_index = $5,
                searchable_content = $6,
                modified_date = datetime($7),
                created_date = datetime($8)
            WHERE modified_date <= datetime($7)"#,
            id,
            file_id,
            content,
            cell_type,
            index,
            searchable_content,
            modified_date,
            created_date
        )
        .execute(&mut *tx)
        .await;

        Ok(result?.rows_affected())
    }

    async fn upsert_repetition_with_modified_date_if_modified_before(
        &self,
        repetition: &Repetition,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let id = repetition.id();
        let file_id = repetition.file_id();
        let cell_id = repetition.cell_id();
        let due = repetition.due();
        let stability = repetition.stability();
        let difficulty = repetition.difficulty();
        let learning_steps = repetition.learning_steps();
        let scheduled_days = repetition.scheduled_days();
        let reps = repetition.reps();
        let lapses = repetition.lapses();
        let state = &repetition.state();
        let last_review = repetition.last_review();
        let additional_content = &repetition.additional_content();
        let created_date = repetition.created_date();

        let result = sqlx::query!(
            r#"INSERT INTO repetitions(
                id,
                file_id,
                cell_id,
                due,
                stability,
                difficulty,
                learning_steps,
                scheduled_days,
                reps,
                lapses,
                state,
                last_review,
                additional_content,
                modified_date,
                created_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, datetime($14), datetime($15))
            ON CONFLICT(id) DO UPDATE SET
                file_id = $2,
                cell_id = $3,
                due = $4,
                stability = $5,
                difficulty = $6,
                learning_steps = $7,
                scheduled_days = $8,
                reps = $9,
                lapses = $10,
                state = $11,
                last_review = $12,
                additional_content = $13,
                modified_date = datetime($14),
                created_date = datetime($15)
            WHERE modified_date <= datetime($14)
            "#,
            id,
            file_id,
            cell_id,
            due,
            stability,
            difficulty,
            learning_steps,
            scheduled_days,
            reps,
            lapses,
            state,
            last_review,
            additional_content,
            modified_date,
            created_date
        )
        .execute(&mut *tx)
        .await;

        Ok(result?.rows_affected())
    }

    async fn move_cells_indices_starting_from(
        &self,
        file_id: Guid,
        start_index: u32,
        direction: MoveDirection,
    ) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let increase_value = if direction == MoveDirection::Up {
            -1
        } else {
            1
        };

        let result = sqlx::query!(
            r#"UPDATE cells
                SET cell_index = cell_index + $1
                WHERE file_id = $2 AND cell_index >= $3"#,
            increase_value,
            file_id,
            start_index
        )
        .execute(&mut *tx)
        .await;

        result?;
        Ok(())
    }

    async fn delete_by_id(
        &self,
        deletion_request: CellDeletionRequest,
    ) -> Result<(), RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let cell_id = deletion_request.id();
        let result = sqlx::query!(r#"DELETE FROM cells WHERE id = $1"#, cell_id,)
            .execute(&mut *tx)
            .await;

        result?;
        Ok(())
    }

    async fn search_cells(&self, search_text: &str) -> Result<Vec<Cell>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        // Trigram tokenizer requires ≥3 chars to use the FTS index.
        // Shorter inputs (including empty, which becomes '%%' = all) fall back to LIKE.
        let rows = if search_text.chars().count() >= 3 {
            let fts_query = format!("\"{}\"", search_text.replace('"', "\"\""));
            sqlx::query_as!(
                CellRow,
                r#"SELECT
                    cell.id as "cell_id: _",
                    cell.created_date as "cell_created_date: _",
                    cell.modified_date as "cell_modified_date: _",
                    cell.file_id as "cell_file_id: _",
                    cell.content as cell_content,
                    cell.cell_index as "cell_index: _",
                    cell.cell_type as "cell_type: _",
                    cell.searchable_content as cell_searchable_content,
                    repetition.id as "repetition_id: _",
                    repetition.created_date as "repetition_created_date: _",
                    repetition.modified_date as "repetition_modified_date: _",
                    repetition.file_id as "repetition_file_id: _",
                    repetition.cell_id as "repetition_cell_id: _",
                    repetition.due as "repetition_due: _",
                    repetition.stability as "repetition_stability: _",
                    repetition.difficulty as "repetition_difficulty: _",
                    repetition.learning_steps as "repetition_learning_steps: _",
                    repetition.scheduled_days as "repetition_scheduled_days",
                    repetition.reps as "repetition_reps: _",
                    repetition.lapses as "repetition_lapses: _",
                    repetition.state as "repetition_state: _",
                    repetition.last_review as "repetition_last_review: _",
                    repetition.additional_content as "repetition_additional_content: _"
                FROM cells_fts AS fts
                JOIN cells AS cell ON fts.rowid = cell.rowid
                LEFT JOIN repetitions AS repetition ON repetition.cell_id = cell.id
                WHERE cells_fts MATCH $1
                LIMIT 150"#,
                fts_query
            )
            .fetch_all(&mut *tx)
            .await
        } else {
            let like_pattern = format!("%{}%", search_text);
            sqlx::query_as!(
                CellRow,
                r#"SELECT
                    cell.id as "cell_id: _",
                    cell.created_date as "cell_created_date: _",
                    cell.modified_date as "cell_modified_date: _",
                    cell.file_id as "cell_file_id: _",
                    cell.content as cell_content,
                    cell.cell_index as "cell_index: _",
                    cell.cell_type as "cell_type: _",
                    cell.searchable_content as cell_searchable_content,
                    repetition.id as "repetition_id: _",
                    repetition.created_date as "repetition_created_date: _",
                    repetition.modified_date as "repetition_modified_date: _",
                    repetition.file_id as "repetition_file_id: _",
                    repetition.cell_id as "repetition_cell_id: _",
                    repetition.due as "repetition_due: _",
                    repetition.stability as "repetition_stability: _",
                    repetition.difficulty as "repetition_difficulty: _",
                    repetition.learning_steps as "repetition_learning_steps: _",
                    repetition.scheduled_days as "repetition_scheduled_days",
                    repetition.reps as "repetition_reps: _",
                    repetition.lapses as "repetition_lapses: _",
                    repetition.state as "repetition_state: _",
                    repetition.last_review as "repetition_last_review: _",
                    repetition.additional_content as "repetition_additional_content: _"
                FROM cells_fts AS fts
                JOIN cells AS cell ON fts.rowid = cell.rowid
                LEFT JOIN repetitions AS repetition ON repetition.cell_id = cell.id
                WHERE fts.searchable_content LIKE $1
                LIMIT 150"#,
                like_pattern
            )
            .fetch_all(&mut *tx)
            .await
        };

        let cells = convert_rows_to_cells(rows?);
        Ok(cells)
    }

    async fn get_study_repetitions(
        &self,
        file_id: Guid,
    ) -> Result<FileRepetitionCounts, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let now = Utc::now().to_utc();
        let rows = sqlx::query!(
            r#"
                SELECT state AS "state: State", COUNT(*) AS "count: u32"
                FROM repetitions
                WHERE file_id = $1 AND due <= $2
                GROUP BY state
            "#,
            file_id,
            now
        )
        .fetch_all(&mut *tx)
        .await;

        let mut counts: FileRepetitionCounts = Default::default();

        for row in rows? {
            if row.state == State::New {
                counts.new = row.count;
            } else if row.state == State::Learning {
                counts.learning = row.count;
            } else if row.state == State::Relearning {
                counts.relearning = row.count;
            } else if row.state == State::Review {
                counts.review = row.count;
            }
        }

        Ok(counts)
    }

    async fn get_study_repetitions_for_all_files(
        &self,
    ) -> Result<HashMap<Guid, FileRepetitionCounts>, RepositoryError> {
        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let now = Utc::now().to_utc();
        let rows = sqlx::query!(
            r#"
                SELECT state AS "state: State", COUNT(*) AS "count: u32", file_id as "file_id: Guid"
                FROM repetitions
                WHERE due <= $1
                GROUP BY file_id, state
            "#,
            now
        )
        .fetch_all(&mut *tx)
        .await;

        let mut output = HashMap::new();

        for row in rows? {
            let entry: &mut FileRepetitionCounts = output.entry(row.file_id).or_default();

            if row.state == State::New {
                entry.new = row.count;
            } else if row.state == State::Learning {
                entry.learning = row.count;
            } else if row.state == State::Relearning {
                entry.relearning = row.count;
            } else if row.state == State::Review {
                entry.review = row.count;
            }
        }

        Ok(output)
    }

    async fn get_home_statistics(&self) -> Result<HomeStatistics, RepositoryError> {
        let start_of_today = Utc::now()
            .with_time(NaiveTime::from_hms_opt(0, 0, 0).unwrap())
            .unwrap();

        let end_of_today = Utc::now()
            .with_time(NaiveTime::from_hms_opt(23, 59, 59).unwrap())
            .unwrap();

        let mut tx = self.tx.lock().await;
        let tx = tx.as_mut();

        let row = sqlx::query!(
            r#"
                SELECT COUNT(*) AS "count: u64", SUM(study_time) AS "total_study_time: u64"
                FROM reviews
                WHERE $1 <= date AND date <= $2
            "#,
            start_of_today,
            end_of_today
        )
        .fetch_one(&mut *tx)
        .await;

        let row = row?;
        let (number_of_reviews, total_study_time) = (row.count, row.total_study_time.unwrap_or(0));

        let start_of_year = Utc::now()
            .with_month(1)
            .unwrap()
            .with_day(1)
            .unwrap()
            .with_time(NaiveTime::from_hms_opt(0, 0, 0).unwrap())
            .unwrap();
        let end_of_year = Utc::now()
            .with_month(12)
            .unwrap()
            .with_day(31)
            .unwrap()
            .with_time(NaiveTime::from_hms_opt(23, 59, 59).unwrap())
            .unwrap();

        let rows = sqlx::query!(
            r#"
                SELECT date(date) AS "date: NaiveDate", COUNT(*) AS "count: u64"
                FROM reviews
                WHERE $1 <= date AND date <= $2
                GROUP BY date(date)
            "#,
            start_of_year,
            end_of_year
        )
        .fetch_all(&mut *tx)
        .await;

        let mut review_counts: HashMap<NaiveDate, u64> = HashMap::new();
        for row in rows? {
            review_counts.insert(row.date.unwrap(), row.count);
        }

        let rows = sqlx::query!(
            r#"
                SELECT date(due) AS "due: NaiveDate", COUNT(*) AS "count: u64"
                FROM repetitions
                WHERE $1 <= due AND due <= $2
                GROUP BY date(due)
            "#,
            start_of_year,
            end_of_year
        )
        .fetch_all(&mut *tx)
        .await?;

        let mut due_counts: HashMap<NaiveDate, u64> = HashMap::new();
        for row in rows {
            due_counts.insert(row.due.unwrap(), row.count);
        }

        Ok(HomeStatistics {
            number_of_reviews,
            total_time: total_study_time,
            review_counts,
            due_counts,
        })
    }
}

async fn upsert_repetitions(
    tx: &mut SqliteConnection,
    repetitions: &Vec<Repetition>,
) -> Result<(), RepositoryError> {
    for repetition in repetitions {
        let id = repetition.id();
        let modified_date = repetition.modified_date();
        let file_id = repetition.file_id();
        let cell_id = repetition.cell_id();
        let due = repetition.due();
        let stability = repetition.stability();
        let difficulty = repetition.difficulty();
        let learning_steps = repetition.learning_steps();
        let scheduled_days = repetition.scheduled_days();
        let reps = repetition.reps();
        let lapses = repetition.lapses();
        let state = &repetition.state();
        let last_review = repetition.last_review();
        let additional_content = &repetition.additional_content();
        let created_date = repetition.created_date();

        let result = sqlx::query!(
            r#"INSERT INTO repetitions(
                id,
                created_date,
                modified_date,
                file_id,
                cell_id,
                due,
                stability,
                difficulty,
                learning_steps,
                scheduled_days,
                reps,
                lapses,
                state,
                last_review,
                additional_content)
            VALUES ($1, datetime($2), datetime($3), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT(id) DO UPDATE SET
                created_date = datetime($2),
                modified_date = datetime($3),
                file_id = $4,
                cell_id = $5,
                due = $6,
                stability = $7,
                difficulty = $8,
                learning_steps = $9,
                scheduled_days = $10,
                reps = $11,
                lapses = $12,
                state = $13,
                last_review = $14,
                additional_content = $15
            "#,
            id,
            created_date,
            modified_date,
            file_id,
            cell_id,
            due,
            stability,
            difficulty,
            learning_steps,
            scheduled_days,
            reps,
            lapses,
            state,
            last_review,
            additional_content
        )
        .execute(&mut *tx)
        .await;

        result?;
    }

    Ok(())
}

#[cfg(test)]
pub mod tests {
    use chrono::Duration;
    use injector::{injector::Injector, register_scope};

    use crate::{
        ROOT_FOLDER_ID,
        cells::{
            entities::{cell::CellType, review::Review},
            repositories::review_repository::ReviewRepository,
            test_utils::create_cell,
        },
        file_system::{
            entities::file::File, repositories::file_repository::FileRepository,
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        infrastructure::{
            extensions::unit_of_work::UnitOfWorkExt,
            repositories::sqlite::{
                sqlite_file_repository::SqliteFileRepository,
                sqlite_review_repository::SqliteReviewRepository,
            },
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn CellRepository, SqliteCellRepository);
        register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        injector
    }

    #[tokio::test]
    pub async fn get_by_id_valid_input_returned_cell_correctly() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cell = create_cell(
            None,
            file.id(),
            r#"
                <cloze index="1">test<cloze>
                <cloze index="2">test<cloze>
            "#
            .to_string(),
            CellType::Cloze,
            0,
        );
        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = cell_repository.get_by_id(cell.id()).await.unwrap();

        // Assert

        assert_eq!(cell.id(), actual.id());
        assert_eq!(2, actual.repetitions().len());
        assert!(
            actual
                .repetitions()
                .iter()
                .any(|r| r.additional_content().unwrap() == "1")
        );
        assert!(
            actual
                .repetitions()
                .iter()
                .any(|r| r.additional_content().unwrap() == "2")
        );
    }

    #[tokio::test]
    pub async fn get_file_cells_ordered_by_index_valid_input_returned_files_ordered() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cells = [
            create_cell(
                None,
                file.id(),
                r#"<cloze index="1"></cloze>"#.to_string(),
                CellType::Cloze,
                0,
            ),
            create_cell(None, file.id(), "".to_string(), CellType::Note, 1),
        ];

        cell_repository.create(&cells[1]).await.unwrap();
        cell_repository.create(&cells[0]).await.unwrap();

        scope.save_changes().await.unwrap();

        // Act

        let actual = cell_repository
            .get_file_cells_ordered_by_index(file.id())
            .await
            .unwrap();

        // Assert

        assert_eq!(cells[0].id(), actual[0].id());
        assert_eq!(1, actual[0].repetitions().len());
        assert_eq!(cells[1].id(), actual[1].id());
    }

    #[tokio::test]
    pub async fn update_deleted_old_repetitions_and_added_new_ones() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let mut cell = create_cell(
            None,
            file.id(),
            r#"
                <cloze index="1">test<cloze>
                <cloze index="2">test<cloze>
            "#
            .to_string(),
            CellType::Cloze,
            0,
        );
        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        let old_repetitions = cell.repetitions().clone();
        cell.set_content_for_tests(
            r#"
                <cloze index="1">test<cloze>
                <cloze index="3">test<cloze>
            "#
            .to_string(),
        );

        // Act

        cell_repository.update(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        // Assert

        let actual = cell_repository.get_by_id(cell.id()).await.unwrap();

        assert_eq!(2, cell.repetitions().len());
        assert!(
            actual
                .repetitions()
                .iter()
                .any(|r| r.additional_content().unwrap() == "1"
                    && old_repetitions.iter().any(|r2| r2.id() == r.id()))
        );
        assert!(
            actual
                .repetitions()
                .iter()
                .any(|r| r.additional_content().unwrap() == "3")
        );

        let deleted_repetition_id = old_repetitions
            .iter()
            .find(|r| r.additional_content().unwrap() == "2")
            .unwrap()
            .id();
        assert!(
            !cell
                .repetitions()
                .iter()
                .any(|r| r.id() == deleted_repetition_id)
        );
    }

    #[tokio::test]
    pub async fn search_cells_valid_input_searched_cells_correctly() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cells = [
            create_cell(None, file.id(), "Test 1".to_string(), CellType::Note, 0),
            create_cell(None, file.id(), "Test 2".to_string(), CellType::Note, 1),
            create_cell(
                None,
                file.id(),
                "Not include".to_string(),
                CellType::Note,
                1,
            ),
        ];

        cell_repository.create(&cells[1]).await.unwrap();
        cell_repository.create(&cells[0]).await.unwrap();

        scope.save_changes().await.unwrap();

        // Act

        let actual = cell_repository.search_cells("test").await.unwrap();

        // Assert

        assert_eq!(2, actual.len());
        assert!(actual.iter().any(|cell| cell.id() == cells[0].id()));
        assert!(actual.iter().any(|cell| cell.id() == cells[1].id()));
    }

    #[tokio::test]
    pub async fn get_study_repetitions_valid_input_returned_count_correctly() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cell_id = Guid::new_v4();
        let create_repetition =
            |due: DateTime<Utc>, state: State, additional_content: Option<String>| {
                Repetition::new_unchecked(
                    Guid::new_v4(),
                    Utc::now(),
                    Utc::now(),
                    file.id(),
                    cell_id,
                    due,
                    0.0,
                    0.0,
                    0,
                    0,
                    0,
                    0,
                    state,
                    None,
                    additional_content,
                )
            };

        let cell = Cell::new_unchecked(
            cell_id,
            Utc::now(),
            Utc::now(),
            file.id(),
            "".to_string(),
            CellType::Cloze,
            0,
            "".to_string(),
            vec![
                create_repetition(Utc::now().to_utc(), State::New, None),
                create_repetition(Utc::now().to_utc(), State::New, None),
                create_repetition(Utc::now().to_utc(), State::Learning, None),
                create_repetition(Utc::now().to_utc(), State::Relearning, None),
                create_repetition(Utc::now().to_utc(), State::Review, None),
                // Due later.
                create_repetition(
                    Utc::now().to_utc() + Duration::days(1),
                    State::New,
                    Some("6".to_string()),
                ),
            ],
        );
        cell_repository.create(&cell).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = cell_repository
            .get_study_repetitions(file.id())
            .await
            .unwrap();

        // Assert

        assert_eq!(2, actual.new);
        assert_eq!(1, actual.learning);
        assert_eq!(1, actual.relearning);
        assert_eq!(1, actual.review);
    }

    #[tokio::test]
    pub async fn get_study_repetitions_for_all_files_valid_input_returned_count_correctly() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;

        let file1 = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        let file2 = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test2".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file1).await.unwrap();
        file_repository.create(&file2).await.unwrap();

        let create_repetition = |cell_id: Guid, file_id: Guid, due: DateTime<Utc>, state: State| {
            Repetition::new_unchecked(
                Guid::new_v4(),
                Utc::now(),
                Utc::now(),
                file_id,
                cell_id,
                due,
                0.0,
                0.0,
                0,
                0,
                0,
                0,
                state,
                None,
                None,
            )
        };

        let cell1_id = Guid::new_v4();
        let cell1 = Cell::new_unchecked(
            cell1_id,
            Utc::now(),
            Utc::now(),
            file1.id(),
            "".to_string(),
            CellType::Cloze,
            0,
            "".to_string(),
            vec![
                create_repetition(cell1_id, file1.id(), Utc::now().to_utc(), State::New),
                create_repetition(cell1_id, file1.id(), Utc::now().to_utc(), State::New),
                create_repetition(cell1_id, file1.id(), Utc::now().to_utc(), State::Learning),
            ],
        );

        let cell2_id = Guid::new_v4();
        let cell2 = Cell::new_unchecked(
            cell2_id,
            Utc::now(),
            Utc::now(),
            file2.id(),
            "".to_string(),
            CellType::Cloze,
            0,
            "".to_string(),
            vec![
                create_repetition(cell2_id, file2.id(), Utc::now().to_utc(), State::Relearning),
                create_repetition(cell2_id, file2.id(), Utc::now().to_utc(), State::Review),
                // Due later.
                create_repetition(
                    cell2_id,
                    file2.id(),
                    Utc::now().to_utc() + Duration::days(1),
                    State::New,
                ),
            ],
        );
        cell_repository.create(&cell1).await.unwrap();
        cell_repository.create(&cell2).await.unwrap();
        scope.save_changes().await.unwrap();

        // Act

        let actual = cell_repository
            .get_study_repetitions_for_all_files()
            .await
            .unwrap();

        // Assert

        assert_eq!(1, actual[&file1.id()].learning);
        assert_eq!(2, actual[&file1.id()].new);
        assert_eq!(0, actual[&file1.id()].relearning);

        assert_eq!(0, actual[&file2.id()].new);
        assert_eq!(1, actual[&file2.id()].relearning);
        assert_eq!(1, actual[&file2.id()].review);
    }

    #[tokio::test]
    async fn get_home_statistics_with_reviews_returned_correct_statistics() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let file_repository = scope.resolve::<dyn FileRepository>().await;
        let cell_repository = scope.resolve::<dyn CellRepository>().await;
        let review_repository = scope.resolve::<dyn ReviewRepository>().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
            FsrsProfileChoice::Inherit,
        );
        file_repository.create(&file).await.unwrap();

        let cell_id = Guid::new_v4();

        let create_repetition = |state: State| {
            Repetition::new_unchecked(
                Guid::new_v4(),
                Utc::now(),
                Utc::now(),
                file.id(),
                cell_id,
                Utc::now(),
                0.0,
                0.0,
                0,
                0,
                0,
                0,
                state,
                None,
                None,
            )
        };

        let cell = Cell::new_unchecked(
            cell_id,
            Utc::now(),
            Utc::now(),
            file.id(),
            "".to_string(),
            CellType::Cloze,
            0,
            "".to_string(),
            vec![
                create_repetition(State::New),
                create_repetition(State::New),
                create_repetition(State::Learning),
                create_repetition(State::Relearning),
                create_repetition(State::Review),
                // Due later.
                create_repetition(State::New),
            ],
        );
        cell_repository.create(&cell).await.unwrap();

        review_repository
            .create(&Review {
                date: Utc::now().to_utc(),
                study_time: 10,
                ..Default::default()
            })
            .await
            .unwrap();
        review_repository
            .create(&Review {
                date: Utc::now().to_utc(),
                study_time: 10,
                ..Default::default()
            })
            .await
            .unwrap();
        review_repository
            .create(&Review {
                date: Utc::now().to_utc() - Duration::days(1),
                study_time: 5,
                ..Default::default()
            })
            .await
            .unwrap();

        scope.save_changes().await.unwrap();

        // Act

        let actual = cell_repository.get_home_statistics().await.unwrap();

        // Assert

        assert_eq!(2, actual.number_of_reviews);
        assert_eq!(20, actual.total_time);
        assert_eq!(2, actual.review_counts[&Utc::now().date_naive()]);
        assert_eq!(
            1,
            actual.review_counts[&(Utc::now().to_utc() - Duration::days(1)).date_naive()]
        );
        assert_eq!(6, actual.due_counts[&Utc::now().date_naive()]);
    }
}
