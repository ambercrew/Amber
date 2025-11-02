use std::{collections::HashMap, sync::Arc};

use async_trait::async_trait;
use chrono::{DateTime, Datelike, NaiveDate, NaiveTime, Utc};
use rand::SeedableRng;
use rand::seq::SliceRandom;
use rand_chacha::ChaCha8Rng;
use sqlx::{QueryBuilder, Sqlite, SqliteConnection, SqlitePool, Transaction};
use tokio::sync::Mutex;

use crate::{
    Guid,
    cells::{
        entities::{
            cell::Cell,
            repetition::{Repetition, State},
        },
        models::{
            cell_deletion_request::CellDeletionRequest,
            file_repetitions_count::FileRepetitionCounts, home_statistics::HomeStatistics,
        },
        repositories::{
            sqlite_rows::cell_row::{CellRow, RepetitionRow, convert_rows_to_cells},
            traits::cell_repository::{CellRepository, MoveDirection},
        },
    },
    common::repository_error::RepositoryError,
};

const SEED: [u8; 32] = [42u8; 32];

pub struct SqliteCellRepository {
    pool: Arc<SqlitePool>,
    tx: Arc<Mutex<Transaction<'static, Sqlite>>>,
}

impl SqliteCellRepository {
    pub fn new(pool: Arc<SqlitePool>, tx: Arc<Mutex<Transaction<'static, Sqlite>>>) -> Self {
        Self { pool, tx }
    }
}

#[async_trait]
impl CellRepository for SqliteCellRepository {
    async fn get_by_id(&self, id: Guid) -> Result<Cell, RepositoryError> {
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
                repetition.elapsed_days as "repetition_elapsed_days: _",
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
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => {
                // Should be a single cell in list.
                let cell = convert_rows_to_cells(rows).remove(0);
                Ok(cell)
            }
        }
    }

    async fn get_file_cells_ordered_by_index_then_created_date(
        &self,
        file_id: Guid,
    ) -> Result<Vec<Cell>, RepositoryError> {
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
                repetition.elapsed_days as "repetition_elapsed_days: _",
                repetition.scheduled_days as "repetition_scheduled_days",
                repetition.reps as "repetition_reps: _",
                repetition.lapses as "repetition_lapses: _",
                repetition.state as "repetition_state: _",
                repetition.last_review as "repetition_last_review: _",
                repetition.additional_content as "repetition_additional_content: _"

            FROM cells As cell
            LEFT JOIN repetitions AS repetition ON repetition.cell_id = cell.id

            WHERE cell.file_id = $1
            ORDER BY cell.cell_index, cell.created_date"#,
            file_id
        )
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => {
                let cells = convert_rows_to_cells(rows);
                Ok(cells)
            }
        }
    }

    async fn get_all_cells_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Cell>, RepositoryError> {
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
                repetition.elapsed_days as "repetition_elapsed_days: _",
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
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => {
                let cells = convert_rows_to_cells(rows);
                Ok(cells)
            }
        }
    }

    async fn get_all_repetitions_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Repetition>, RepositoryError> {
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
                elapsed_days as "elapsed_days: _",
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
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => {
                let result = rows.into_iter().map(|row| row.into()).collect::<Vec<_>>();
                Ok(result)
            }
        }
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

        if let Err(err) = result {
            return Err(RepositoryError::UnknownError(err.to_string()));
        }

        self.upsert_repetitions(tx, cell.repetitions()).await
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

        if let Err(err) = result {
            return Err(RepositoryError::UnknownError(err.to_string()));
        }

        // Deleteing removed repetitions.

        let mut query_builder: QueryBuilder<sqlx::Sqlite> =
            QueryBuilder::new("DELETE FROM repetitions WHERE cell_id = ");
        query_builder.push_bind(id);
        query_builder.push(" AND id NOT IN (");
        let mut separated = query_builder.separated(",");
        for repetition in cell.repetitions() {
            separated.push_bind(repetition.id);
        }
        separated.push_unseparated(")");

        if let Err(err) = query_builder.build().execute(&mut *tx).await {
            return Err(RepositoryError::UnknownError(err.to_string()));
        }

        self.upsert_repetitions(tx, cell.repetitions()).await
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

        match result {
            Ok(result) => Ok(result.rows_affected()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
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
        let elapsed_days = repetition.elapsed_days();
        let scheduled_days = repetition.scheduled_days();
        let reps = repetition.reps();
        let lapses = repetition.lapses();
        let state = repetition.state();
        let last_review = repetition.last_review();
        let additional_content = repetition.additional_content();
        let created_date = repetition.created_date();

        let result = sqlx::query!(
            r#"INSERT INTO repetitions(
                id,
                file_id,
                cell_id,
                due,
                stability,
                difficulty,
                elapsed_days,
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
                elapsed_days = $7,
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
            elapsed_days,
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

        match result {
            Ok(result) => Ok(result.rows_affected()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
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

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
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

        match result {
            Ok(_) => Ok(()),
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
        }
    }

    async fn search_cells(&self, search_text: &str) -> Result<Vec<Cell>, RepositoryError> {
        let search_match = format!("%{}%", search_text);

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
                repetition.elapsed_days as "repetition_elapsed_days: _",
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
            search_match
        )
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => {
                let cells = convert_rows_to_cells(rows);
                Ok(cells)
            }
        }
    }

    async fn get_file_repetitions_shuffled(
        &self,
        file_id: Guid,
    ) -> Result<Vec<Repetition>, RepositoryError> {
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
                elapsed_days as "elapsed_days: _",
                scheduled_days as "scheduled_days",
                reps as "reps: _",
                lapses as "lapses: _",
                state as "state: _",
                last_review as "last_review: _",
                additional_content as "additional_content: _"

            FROM repetitions
            WHERE file_id = $1"#,
            file_id
        )
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => {
                let mut result = rows.into_iter().map(|row| row.into()).collect::<Vec<_>>();
                let mut rng = ChaCha8Rng::from_seed(SEED);
                result.shuffle(&mut rng);
                Ok(result)
            }
        }
    }

    async fn get_study_repetitions(
        &self,
        file_id: Guid,
    ) -> Result<FileRepetitionCounts, RepositoryError> {
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
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => {
                let mut counts: FileRepetitionCounts = Default::default();

                for row in rows {
                    if row.state == State::New {
                        counts.new = row.count.unwrap_or_default();
                    } else if row.state == State::Learning {
                        counts.learning = row.count.unwrap_or_default();
                    } else if row.state == State::Relearning {
                        counts.relearning = row.count.unwrap_or_default();
                    } else if row.state == State::Review {
                        counts.review = row.count.unwrap_or_default();
                    }
                }

                Ok(counts)
            }
        }
    }

    async fn get_study_repetitions_for_all_files(
        &self,
    ) -> Result<HashMap<Guid, FileRepetitionCounts>, RepositoryError> {
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
        .fetch_all(&*self.pool)
        .await;

        match rows {
            Err(err) => Err(RepositoryError::UnknownError(err.to_string())),
            Ok(rows) => {
                let mut output = HashMap::new();

                for row in rows {
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
        }
    }

    async fn get_home_statistics(&self) -> Result<HomeStatistics, RepositoryError> {
        let start_of_today = Utc::now()
            .with_time(NaiveTime::from_hms_opt(0, 0, 0).unwrap())
            .unwrap();

        let end_of_today = Utc::now()
            .with_time(NaiveTime::from_hms_opt(23, 59, 59).unwrap())
            .unwrap();

        let row = sqlx::query!(
            r#"
                SELECT COUNT(*) AS "count: u64", SUM(study_time) AS "total_study_time: u64"
                FROM reviews
                WHERE $1 <= date AND date <= $2
            "#,
            start_of_today,
            end_of_today
        )
        .fetch_one(&*self.pool)
        .await;

        let (number_of_reviews, total_study_time) = match row {
            Ok(result) => (result.count, result.total_study_time.unwrap_or(0)),
            Err(err) => return Err(RepositoryError::UnknownError(err.to_string())),
        };

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
            .with_time(NaiveTime::from_hms_opt(11, 59, 59).unwrap())
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
        .fetch_all(&*self.pool)
        .await;

        if let Err(err) = rows {
            return Err(RepositoryError::UnknownError(err.to_string()));
        }

        let mut review_counts: HashMap<NaiveDate, u64> = HashMap::new();
        for row in rows.unwrap() {
            review_counts.insert(row.date.unwrap(), row.count.unwrap_or(0));
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
        .fetch_all(&*self.pool)
        .await;

        if let Err(err) = rows {
            return Err(RepositoryError::UnknownError(err.to_string()));
        }

        let mut due_counts: HashMap<NaiveDate, u64> = HashMap::new();
        for row in rows.unwrap() {
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

impl SqliteCellRepository {
    async fn upsert_repetitions(
        &self,
        tx: &mut SqliteConnection,
        repetitions: &Vec<Repetition>,
    ) -> Result<(), RepositoryError> {
        for repetition in repetitions {
            let Repetition {
                id,
                created_date,
                modified_date,
                file_id,
                cell_id,
                due,
                stability,
                difficulty,
                elapsed_days,
                scheduled_days,
                reps,
                lapses,
                state,
                last_review,
                additional_content,
            } = repetition;

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
                    elapsed_days,
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
                    elapsed_days = $9,
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
                elapsed_days,
                scheduled_days,
                reps,
                lapses,
                state,
                last_review,
                additional_content
            )
            .execute(&mut *tx)
            .await;

            if let Err(err) = result {
                return Err(RepositoryError::UnknownError(err.to_string()));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use chrono::Duration;

    use crate::{
        ROOT_FOLDER_ID,
        cells::entities::{cell::CellType, review::Review},
        common::{
            sqlite_repositories_context::SqliteRepositoriesContext,
            traits::repositories_context::RepositoriesContext,
        },
        file_system::entities::file::File,
    };

    use super::*;

    #[tokio::test]
    pub async fn get_by_id_valid_input_returned_cell_correctly() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        context.file_repository().create(&file).await.unwrap();

        let cell = Cell::new(
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
        context.cell_repository().create(&cell).await.unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .cell_repository()
            .get_by_id(cell.id())
            .await
            .unwrap();

        // Assert

        assert_eq!(cell.id(), actual.id());
        assert_eq!(2, actual.repetitions().len());
        assert!(
            actual
                .repetitions()
                .iter()
                .any(|r| r.additional_content.as_ref().unwrap() == "1")
        );
        assert!(
            actual
                .repetitions()
                .iter()
                .any(|r| r.additional_content.as_ref().unwrap() == "2")
        );
    }

    #[tokio::test]
    pub async fn get_file_cells_ordered_by_index_then_created_date_valid_input_returned_files_ordered() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        context.file_repository().create(&file).await.unwrap();

        let cells = [
            Cell::new(
                None,
                file.id(),
                r#"<cloze index="1"></cloze>"#.to_string(),
                CellType::Cloze,
                0,
            ),
            Cell::new(None, file.id(), "".to_string(), CellType::Note, 1),
        ];

        context.cell_repository().create(&cells[1]).await.unwrap();
        context.cell_repository().create(&cells[0]).await.unwrap();

        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .cell_repository()
            .get_file_cells_ordered_by_index_then_created_date(file.id())
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

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        context.file_repository().create(&file).await.unwrap();

        let mut cell = Cell::new(
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
        context.cell_repository().create(&cell).await.unwrap();
        context.save_changes().await.unwrap();

        let old_repetitions = cell.repetitions().clone();
        cell.set_content(
            r#"
                <cloze index="1">test<cloze>
                <cloze index="3">test<cloze>
            "#
            .to_string(),
        );

        // Act

        context.cell_repository().update(&cell).await.unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let actual = context
            .cell_repository()
            .get_by_id(cell.id())
            .await
            .unwrap();

        assert_eq!(2, cell.repetitions().len());
        assert!(
            actual
                .repetitions()
                .iter()
                .any(|r| r.additional_content.as_ref().unwrap() == "1"
                    && old_repetitions.iter().any(|r2| r2.id == r.id))
        );
        assert!(
            actual
                .repetitions()
                .iter()
                .any(|r| r.additional_content.as_ref().unwrap() == "3")
        );

        let deleted_repetition_id = old_repetitions
            .iter()
            .find(|r| r.additional_content.as_ref().unwrap() == "2")
            .unwrap()
            .id;
        assert!(
            !cell
                .repetitions()
                .iter()
                .any(|r| r.id == deleted_repetition_id)
        );
    }

    #[tokio::test]
    pub async fn search_cells_valid_input_searched_cells_correctly() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        context.file_repository().create(&file).await.unwrap();

        let cells = [
            Cell::new(None, file.id(), "Test 1".to_string(), CellType::Note, 0),
            Cell::new(None, file.id(), "Test 2".to_string(), CellType::Note, 1),
            Cell::new(
                None,
                file.id(),
                "Not include".to_string(),
                CellType::Note,
                1,
            ),
        ];

        context.cell_repository().create(&cells[1]).await.unwrap();
        context.cell_repository().create(&cells[0]).await.unwrap();

        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .cell_repository()
            .search_cells("test")
            .await
            .unwrap();

        // Assert

        assert_eq!(2, actual.len());
        assert!(actual.iter().any(|cell| cell.id() == cells[0].id()));
        assert!(actual.iter().any(|cell| cell.id() == cells[1].id()));
    }

    #[tokio::test]
    pub async fn delete_by_id_cloze_cell_deleted_repetitions() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        context.file_repository().create(&file).await.unwrap();

        let cell = Cell::new(
            None,
            file.id(),
            r#"
                <cloze index="1">test<cloze>
            "#
            .to_string(),
            CellType::Cloze,
            0,
        );
        context.cell_repository().create(&cell).await.unwrap();
        context.save_changes().await.unwrap();

        // Act

        context
            .cell_repository()
            .delete_by_id(CellDeletionRequest::new(cell.id()))
            .await
            .unwrap();
        context.save_changes().await.unwrap();

        // Assert

        let actual = context
            .cell_repository()
            .get_file_repetitions_shuffled(file.id())
            .await
            .unwrap();
        assert_eq!(0, actual.len());
    }

    #[tokio::test]
    pub async fn get_file_repetitions_returned_all_repetitions_correctly() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        context.file_repository().create(&file).await.unwrap();

        let cell = Cell::new(
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
        context.cell_repository().create(&cell).await.unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .cell_repository()
            .get_file_repetitions_shuffled(file.id())
            .await
            .unwrap();

        // Assert

        assert_eq!(2, actual.len());
        assert!(
            actual
                .iter()
                .any(|r| r.additional_content.as_ref().unwrap() == "1")
        );
        assert!(
            actual
                .iter()
                .any(|r| r.additional_content.as_ref().unwrap() == "2")
        );
    }

    #[tokio::test]
    pub async fn get_study_repetitions_valid_input_returned_count_correctly() {
        // Arrange

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        context.file_repository().create(&file).await.unwrap();

        let cell_id = Guid::new_v4();
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
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::New,
                    ..Default::default()
                },
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::New,
                    ..Default::default()
                },
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::Learning,
                    ..Default::default()
                },
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::Relearning,
                    ..Default::default()
                },
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::Review,
                    ..Default::default()
                },
                // Due later.
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc() + Duration::days(1),
                    state: State::New,
                    additional_content: Some("6".to_string()),
                    ..Default::default()
                },
            ],
        );
        context.cell_repository().create(&cell).await.unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .cell_repository()
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

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file1 = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        let file2 = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test2".try_into().unwrap(),
        );
        context.file_repository().create(&file1).await.unwrap();
        context.file_repository().create(&file2).await.unwrap();

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
                Repetition {
                    cell_id: cell1_id,
                    file_id: file1.id(),
                    due: Utc::now().to_utc(),
                    state: State::New,
                    ..Default::default()
                },
                Repetition {
                    cell_id: cell1_id,
                    file_id: file1.id(),
                    due: Utc::now().to_utc(),
                    state: State::New,
                    ..Default::default()
                },
                Repetition {
                    cell_id: cell1_id,
                    file_id: file1.id(),
                    due: Utc::now().to_utc(),
                    state: State::Learning,
                    ..Default::default()
                },
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
                Repetition {
                    cell_id: cell2_id,
                    file_id: file2.id(),
                    due: Utc::now().to_utc(),
                    state: State::Relearning,
                    ..Default::default()
                },
                Repetition {
                    cell_id: cell2_id,
                    file_id: file2.id(),
                    due: Utc::now().to_utc(),
                    state: State::Review,
                    ..Default::default()
                },
                // Due later.
                Repetition {
                    cell_id: cell2_id,
                    file_id: file2.id(),
                    due: Utc::now().to_utc() + Duration::days(1),
                    state: State::New,
                    additional_content: Some("6".to_string()),
                    ..Default::default()
                },
            ],
        );
        context.cell_repository().create(&cell1).await.unwrap();
        context.cell_repository().create(&cell2).await.unwrap();
        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .cell_repository()
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

        let mut context = SqliteRepositoriesContext::create_testing_context().await;

        let file = File::new_unchecked(
            Guid::new_v4(),
            Utc::now(),
            Utc::now(),
            Some(ROOT_FOLDER_ID),
            "test".try_into().unwrap(),
        );
        context.file_repository().create(&file).await.unwrap();

        let cell_id = Guid::new_v4();
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
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::New,
                    ..Default::default()
                },
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::New,
                    ..Default::default()
                },
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::Learning,
                    ..Default::default()
                },
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::Relearning,
                    ..Default::default()
                },
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc(),
                    state: State::Review,
                    ..Default::default()
                },
                // Due later.
                Repetition {
                    cell_id,
                    file_id: file.id(),
                    due: Utc::now().to_utc() + Duration::days(5),
                    state: State::New,
                    additional_content: Some("6".to_string()),
                    ..Default::default()
                },
            ],
        );
        context.cell_repository().create(&cell).await.unwrap();

        context
            .review_repository()
            .create(&Review {
                date: Utc::now().to_utc(),
                study_time: 10,
                ..Default::default()
            })
            .await
            .unwrap();
        context
            .review_repository()
            .create(&Review {
                date: Utc::now().to_utc(),
                study_time: 10,
                ..Default::default()
            })
            .await
            .unwrap();
        context
            .review_repository()
            .create(&Review {
                date: Utc::now().to_utc() - Duration::days(1),
                study_time: 5,
                ..Default::default()
            })
            .await
            .unwrap();

        context.save_changes().await.unwrap();

        // Act

        let actual = context
            .cell_repository()
            .get_home_statistics()
            .await
            .unwrap();

        // Assert

        assert_eq!(2, actual.number_of_reviews);
        assert_eq!(20, actual.total_time);
        assert_eq!(2, actual.review_counts[&Utc::now().date_naive()]);
        assert_eq!(
            1,
            actual.review_counts[&(Utc::now().to_utc() - Duration::days(1)).date_naive()]
        );
        assert_eq!(5, actual.due_counts[&Utc::now().date_naive()]);
        assert_eq!(
            1,
            actual.due_counts[&(Utc::now().to_utc() + Duration::days(5)).date_naive()]
        );
    }
}
