use std::collections::HashMap;

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::{
    Guid,
    cells::{
        entities::{cell::Cell, repetition::Repetition},
        models::{
            cell_deletion_request::CellDeletionRequest,
            file_repetitions_count::FileRepetitionCounts, home_statistics::HomeStatistics,
        },
    },
    common::repository_error::RepositoryError,
};

#[async_trait]
pub trait CellRepository: Send + Sync {
    async fn get_by_id(&self, id: Guid) -> Result<Cell, RepositoryError>;
    // TODO: if not used, delete
    async fn try_get_by_id(&self, id: Guid) -> Result<Option<Cell>, RepositoryError>;

    async fn get_file_cells_ordered_by_index(
        &self,
        file_id: Guid,
    ) -> Result<Vec<Cell>, RepositoryError>;

    async fn create(&self, cell: &Cell) -> Result<(), RepositoryError>;
    async fn update(&self, cell: &Cell) -> Result<(), RepositoryError>;

    async fn upsert_with_modified_date_if_modified_before(
        &self,
        cell: &Cell,
        date: DateTime<Utc>,
    ) -> Result<(), RepositoryError>;

    /// Moves all the indicies of cells up or down based on the given direction.
    /// The cells moved must belong to the file given and must have an index
    /// greater than or equal to the given value.
    async fn move_cells_indices_starting_from(
        &self,
        file_id: Guid,
        start_index: u32,
        direction: MoveDirection,
    ) -> Result<(), RepositoryError>;

    async fn delete_by_id(&self, id: CellDeletionRequest) -> Result<(), RepositoryError>;

    async fn search_cells(&self, search_text: &str) -> Result<Vec<Cell>, RepositoryError>;

    /// This function returns all repetitions belonging to a file in a random number.
    async fn get_file_repetitions_shuffled(
        &self,
        file_id: Guid,
    ) -> Result<Vec<Repetition>, RepositoryError>;

    /// Returns the count of repetitions ready for study, i.e. their due is less
    /// than or equal to now.
    async fn get_study_repetitions(
        &self,
        file_id: Guid,
    ) -> Result<FileRepetitionCounts, RepositoryError>;

    /// Returns the count of repetitions ready for study, i.e. their due is less
    /// than or equal to now.
    async fn get_study_repetitions_for_all_files(
        &self,
    ) -> Result<HashMap<Guid, FileRepetitionCounts>, RepositoryError>;

    async fn get_home_statistics(&self) -> Result<HomeStatistics, RepositoryError>;
}

#[derive(PartialEq, Eq)]
pub enum MoveDirection {
    Up,
    Down,
}
