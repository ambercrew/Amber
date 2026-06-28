use std::sync::Arc;

use async_trait::async_trait;
use fractional_index::FractionalIndex;
use injector_derive::ScopeInjectable;

use crate::common::repository_error::RepositoryError;
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::element_repository::ElementRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::value_objects::element_id::ElementId;

#[derive(ScopeInjectable)]
pub struct SqliteElementRepository {
    folder_repo: Arc<dyn FolderRepository>,
    reading_repo: Arc<dyn ReadingRepository>,
    extract_repo: Arc<dyn ExtractRepository>,
    card_repo: Arc<dyn CardRepository>,
}

#[async_trait]
impl ElementRepository for SqliteElementRepository {
    async fn delete(&self, id: ElementId) -> Result<(), RepositoryError> {
        match id {
            ElementId::Folder(_) => self.folder_repo.delete(id).await,
            ElementId::Reading(_) => self.reading_repo.delete(id).await,
            ElementId::Extract(_) => self.extract_repo.delete(id).await,
            ElementId::Card(_) => self.card_repo.delete(id).await,
        }
    }

    async fn rename(&self, id: ElementId, new_name: String) -> Result<(), RepositoryError> {
        match id {
            ElementId::Folder(_) => self.folder_repo.rename(id, new_name).await,
            ElementId::Reading(_) => self.reading_repo.rename(id, new_name).await,
            ElementId::Extract(_) => self.extract_repo.rename(id, new_name).await,
            ElementId::Card(_) => self.card_repo.rename(id, new_name).await,
        }
    }

    async fn exists(&self, id: ElementId) -> Result<bool, RepositoryError> {
        match id {
            ElementId::Folder(_) => self.folder_repo.exists(id).await,
            ElementId::Reading(_) => self.reading_repo.exists(id).await,
            ElementId::Extract(_) => self.extract_repo.exists(id).await,
            ElementId::Card(_) => self.card_repo.exists(id).await,
        }
    }

    async fn get_location(
        &self,
        id: ElementId,
    ) -> Result<(Option<ElementId>, FractionalIndex), RepositoryError> {
        match id {
            ElementId::Folder(_) => self.folder_repo.get_location(id).await,
            ElementId::Reading(_) => self.reading_repo.get_location(id).await,
            ElementId::Extract(_) => self.extract_repo.get_location(id).await,
            ElementId::Card(_) => self.card_repo.get_location(id).await,
        }
    }

    async fn move_to(
        &self,
        id: ElementId,
        new_parent: Option<ElementId>,
        new_position: FractionalIndex,
    ) -> Result<(), RepositoryError> {
        match id {
            ElementId::Folder(_) => self.folder_repo.move_to(id, new_parent, new_position).await,
            ElementId::Reading(_) => {
                self.reading_repo
                    .move_to(id, new_parent, new_position)
                    .await
            }
            ElementId::Extract(_) => {
                self.extract_repo
                    .move_to(id, new_parent, new_position)
                    .await
            }
            ElementId::Card(_) => self.card_repo.move_to(id, new_parent, new_position).await,
        }
    }
}
