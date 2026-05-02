use std::collections::HashMap;

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use crate::{
    Guid,
    cells::{
        entities::{cell::Cell, repetition::Repetition},
        value_objects::{
            file_repetitions_count::FileRepetitionCounts, home_statistics::HomeStatistics,
        },
    },
    common::repository_error::RepositoryError,
};

#[async_trait]
pub trait CellRepository: Send + Sync {
    async fn get_by_id(&self, id: Guid) -> Result<Cell, RepositoryError>;

    async fn get_file_cells_ordered_by_index(
        &self,
        file_id: Guid,
    ) -> Result<Vec<Cell>, RepositoryError>;

    async fn get_number_of_cells_in_file_with_index(
        &self,
        file_id: Guid,
        index: u32,
    ) -> Result<u32, RepositoryError>;

    async fn get_number_of_cells_in_file(&self, file_id: Guid) -> Result<u32, RepositoryError>;

    async fn get_all_cells_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Cell>, RepositoryError>;

    async fn get_all_repetitions_modified_on_or_after(
        &self,
        modified_date: DateTime<Utc>,
    ) -> Result<Vec<Repetition>, RepositoryError>;

    async fn create(&self, cell: &Cell) -> Result<(), RepositoryError>;
    async fn update(&self, cell: &Cell) -> Result<(), RepositoryError>;

    async fn upsert_cell_without_repetition_and_with_modified_date_if_modified_before(
        &self,
        cell: &Cell,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError>;

    async fn upsert_repetition_with_modified_date_if_modified_before(
        &self,
        repetition: &Repetition,
        modified_date: DateTime<Utc>,
    ) -> Result<u64, RepositoryError>;

    /// Moves all the indices of cells up or down based on the given direction.
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

pub struct CellDeletionRequest(Guid);

impl CellDeletionRequest {
    pub(in crate::cells) fn new(uuid: Guid) -> Self {
        Self(uuid)
    }

    pub fn id(&self) -> Guid {
        self.0
    }
}
