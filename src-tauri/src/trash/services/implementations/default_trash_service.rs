use std::sync::Arc;

use async_trait::async_trait;
use chrono::{Duration, Utc};
use injector_derive::ScopeInjectable;

use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::services::element_index_service::ElementIndexService;
use crate::elements::value_objects::element_id::ElementId;
use crate::trash::entities::trashed_element::TrashedElement;
use crate::trash::repositories::trash_repository::TrashRepository;
use crate::trash::services::trash_service::{TrashService, TrashServiceError};

#[derive(ScopeInjectable)]
pub struct DefaultTrashService {
    trash_repository: Arc<dyn TrashRepository>,
    meta_repository: Arc<dyn MetaRepository>,
    element_index_service: Arc<dyn ElementIndexService>,
}

#[async_trait]
impl TrashService for DefaultTrashService {
    async fn trash_element(&self, id: ElementId) -> Result<(), TrashServiceError> {
        self.trash_repository.trash(id, Utc::now()).await?;
        Ok(())
    }

    async fn restore_element(&self, id: ElementId) -> Result<(), TrashServiceError> {
        self.trash_repository.restore(id, Utc::now()).await?;

        // An ancestor may have been permanently deleted in the meantime, or
        // still be trashed itself. Either way the element would come back
        // invisible, so it is put back at the root instead.
        if !self.trash_repository.has_live_ancestry(id).await? {
            let position = self.element_index_service.get_new_last_index(None).await?;
            self.meta_repository.move_to(id, None, position).await?;
        }

        Ok(())
    }

    async fn list_trash(&self) -> Result<Vec<TrashedElement>, TrashServiceError> {
        Ok(self.trash_repository.get_trashed_roots().await?)
    }

    async fn delete_permanently(&self, id: ElementId) -> Result<(), TrashServiceError> {
        if !self.trash_repository.is_trashed(id).await? {
            return Err(TrashServiceError::NotInTrash);
        }
        self.meta_repository.delete(id).await?;
        Ok(())
    }

    // Deleting a root cascades to its subtree, so a root nested inside another
    // one may already be gone by the time its turn comes; the delete is then a
    // no-op rather than an error.
    async fn empty_trash(&self) -> Result<(), TrashServiceError> {
        for root in self.trash_repository.get_trashed_roots().await? {
            self.meta_repository.delete(root.element_id).await?;
        }
        Ok(())
    }

    async fn purge_expired(&self, retention_days: u32) -> Result<usize, TrashServiceError> {
        let cutoff = Utc::now() - Duration::days(retention_days.into());
        let expired = self
            .trash_repository
            .get_roots_trashed_before(cutoff)
            .await?;

        for id in &expired {
            log::info!("Purging trashed element {id:?} past the retention threshold.");
            self.meta_repository.delete(*id).await?;
        }

        Ok(expired.len())
    }
}

#[cfg(test)]
mod tests {
    use chrono::{DateTime, Duration};
    use fractional_index::FractionalIndex;
    use injector::{injector::Injector, register_scope};
    use uuid::Uuid;

    use crate::{
        elements::{
            entities::{folder::Folder, reading::Reading},
            repositories::{
                folder_repository::FolderRepository, reading_repository::ReadingRepository,
            },
            services::implementations::default_element_index_service::DefaultElementIndexService,
            value_objects::{meta::Meta, read_point::ReadPoint},
        },
        infrastructure::repositories::sqlite::{
            sqlite_folder_repository::SqliteFolderRepository,
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_reading_repository::SqliteReadingRepository,
            sqlite_trash_repository::SqliteTrashRepository,
        },
        test_utils::create_test_injector,
        trash::entities::trash_state::TrashState,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;

        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(injector, dyn TrashRepository, SqliteTrashRepository);
        register_scope!(
            injector,
            dyn ElementIndexService,
            DefaultElementIndexService
        );
        register_scope!(injector, dyn TrashService, DefaultTrashService);

        injector
    }

    fn make_meta(element_id: ElementId) -> Meta {
        Meta {
            element_id,
            name: "test".into(),
            parent: None,
            position: FractionalIndex::default(),
            priority: FractionalIndex::default(),
            study_profile_id: None,
            bibliographical_source_id: None,
            derived_from: None,
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
    }

    fn make_folder(name: &str, parent: Option<ElementId>) -> Folder {
        Folder {
            meta: Meta {
                name: name.into(),
                parent,
                ..make_meta(ElementId::Folder(Uuid::new_v4()))
            },
        }
    }

    fn make_reading(name: &str, parent: Option<ElementId>) -> Reading {
        Reading {
            interval_multiplier: 1.2,
            read_point: ReadPoint::default(),
            meta: Meta {
                name: name.into(),
                parent,
                ..make_meta(ElementId::Reading(Uuid::new_v4()))
            },
        }
    }

    #[tokio::test]
    async fn trash_element_folder_with_child_hides_whole_subtree_from_tree() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let reading_repository = scope.resolve::<dyn ReadingRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        let reading = make_reading("Photosynthesis", Some(folder_id));
        folder_repository.create(folder).await.unwrap();
        reading_repository
            .create(reading, Vec::new())
            .await
            .unwrap();

        // Act

        service.trash_element(folder_id).await.unwrap();

        // Assert

        assert!(folder_repository.get_all().await.unwrap().is_empty());
        assert!(reading_repository.get_all().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn trash_element_child_was_trashed_first_keeps_that_child_out_of_the_parents_subtree() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        let reading = make_reading("Photosynthesis", Some(folder_id));
        let reading_id = reading.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        scope
            .resolve::<dyn ReadingRepository>()
            .await
            .create(reading, Vec::new())
            .await
            .unwrap();

        service.trash_element(reading_id).await.unwrap();

        // Act

        service.trash_element(folder_id).await.unwrap();

        // Assert — both are trash roots, and restoring the folder leaves the
        // reading the user trashed separately in the trash.

        let trashed = service.list_trash().await.unwrap();
        assert_eq!(2, trashed.len());
        assert_eq!(
            0,
            trashed
                .iter()
                .find(|element| element.element_id == folder_id)
                .unwrap()
                .descendant_count
        );

        service.restore_element(folder_id).await.unwrap();

        let trashed = service.list_trash().await.unwrap();
        assert_eq!(1, trashed.len());
        assert_eq!(reading_id, trashed[0].element_id);
    }

    #[tokio::test]
    async fn restore_element_descendant_is_a_trash_root_leaves_that_descendant_in_the_trash() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let trash_repository = scope.resolve::<dyn TrashRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        let reading = make_reading("Photosynthesis", Some(folder_id));
        let reading_id = reading.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        scope
            .resolve::<dyn ReadingRepository>()
            .await
            .create(reading, Vec::new())
            .await
            .unwrap();

        service.trash_element(folder_id).await.unwrap();
        // Makes the reading a trash root of its own inside the trashed folder,
        // the way an incoming sync of a trash state can.
        trash_repository
            .trash(reading_id, Utc::now())
            .await
            .unwrap();

        // Act

        service.restore_element(folder_id).await.unwrap();

        // Assert

        let trashed = service.list_trash().await.unwrap();
        assert_eq!(1, trashed.len());
        assert_eq!(reading_id, trashed[0].element_id);
    }

    #[tokio::test]
    async fn restore_element_grandparent_is_trashed_moves_element_to_root() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let trash_repository = scope.resolve::<dyn TrashRepository>().await;
        let reading_repository = scope.resolve::<dyn ReadingRepository>().await;

        let grandparent = make_folder("Science", None);
        let grandparent_id = grandparent.meta.element_id;
        let parent = make_folder("Biology", Some(grandparent_id));
        let parent_id = parent.meta.element_id;
        let reading = make_reading("Photosynthesis", Some(parent_id));
        let reading_id = reading.meta.element_id;

        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        folder_repository.create(grandparent).await.unwrap();
        folder_repository.create(parent).await.unwrap();
        reading_repository
            .create(reading, Vec::new())
            .await
            .unwrap();

        service.trash_element(reading_id).await.unwrap();
        // Trashes only the grandparent's own row, leaving the parent live, the
        // way an incoming sync of a single trash state does.
        trash_repository
            .apply_state(TrashState {
                element_id: grandparent_id.id(),
                element_created_at: Utc::now(),
                trashed_at: Some(Utc::now()),
                trashed_root: true,
                trash_modified_at: Utc::now(),
            })
            .await
            .unwrap();

        // Act

        service.restore_element(reading_id).await.unwrap();

        // Assert — the live parent is itself hidden behind the trashed
        // grandparent, so the reading cannot come back under it.

        let readings = reading_repository.get_all().await.unwrap();
        assert_eq!(1, readings.len());
        assert_eq!(None, readings[0].meta.parent);
    }

    #[tokio::test]
    async fn list_trash_trashed_folder_with_child_returns_only_the_root() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        let reading = make_reading("Photosynthesis", Some(folder_id));
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        scope
            .resolve::<dyn ReadingRepository>()
            .await
            .create(reading, Vec::new())
            .await
            .unwrap();
        service.trash_element(folder_id).await.unwrap();

        // Act

        let actual = service.list_trash().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!(folder_id, actual[0].element_id);
        assert_eq!("Science", actual[0].name);
        assert_eq!(1, actual[0].descendant_count);
    }

    #[tokio::test]
    async fn restore_element_trashed_subtree_brings_back_every_element() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;
        let reading_repository = scope.resolve::<dyn ReadingRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        let reading = make_reading("Photosynthesis", Some(folder_id));
        let reading_id = reading.meta.element_id;
        folder_repository.create(folder).await.unwrap();
        reading_repository
            .create(reading, Vec::new())
            .await
            .unwrap();
        service.trash_element(folder_id).await.unwrap();

        // Act

        service.restore_element(folder_id).await.unwrap();

        // Assert

        assert!(service.list_trash().await.unwrap().is_empty());
        let readings = reading_repository.get_all().await.unwrap();
        assert_eq!(1, readings.len());
        assert_eq!(reading_id, readings[0].meta.element_id);
        assert_eq!(Some(folder_id), readings[0].meta.parent);
    }

    #[tokio::test]
    async fn restore_element_parent_is_still_trashed_moves_element_to_root() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let trash_repository = scope.resolve::<dyn TrashRepository>().await;
        let reading_repository = scope.resolve::<dyn ReadingRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        let reading = make_reading("Photosynthesis", Some(folder_id));
        let reading_id = reading.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        reading_repository
            .create(reading, Vec::new())
            .await
            .unwrap();

        service.trash_element(folder_id).await.unwrap();
        // Makes the reading a trash root of its own inside the trashed folder,
        // the way an incoming sync of a trash state can.
        trash_repository
            .trash(reading_id, Utc::now())
            .await
            .unwrap();

        // Act

        service.restore_element(reading_id).await.unwrap();

        // Assert

        let readings = reading_repository.get_all().await.unwrap();
        assert_eq!(1, readings.len());
        assert_eq!(None, readings[0].meta.parent);
    }

    #[tokio::test]
    async fn delete_permanently_element_is_not_in_the_trash_returns_not_in_trash() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let meta_repository = scope.resolve::<dyn MetaRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();

        // Act

        let actual = service.delete_permanently(folder_id).await;

        // Assert

        assert!(matches!(actual, Err(TrashServiceError::NotInTrash)));
        assert!(meta_repository.exists(folder_id).await.unwrap());
    }

    #[tokio::test]
    async fn delete_permanently_descendant_of_a_trashed_root_deletes_the_descendant() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let meta_repository = scope.resolve::<dyn MetaRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        let reading = make_reading("Photosynthesis", Some(folder_id));
        let reading_id = reading.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        scope
            .resolve::<dyn ReadingRepository>()
            .await
            .create(reading, Vec::new())
            .await
            .unwrap();
        service.trash_element(folder_id).await.unwrap();

        // Act

        service.delete_permanently(reading_id).await.unwrap();

        // Assert

        assert!(!meta_repository.exists(reading_id).await.unwrap());
        assert!(meta_repository.exists(folder_id).await.unwrap());
    }

    #[tokio::test]
    async fn empty_trash_two_trashed_roots_deletes_both_permanently() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let meta_repository = scope.resolve::<dyn MetaRepository>().await;
        let folder_repository = scope.resolve::<dyn FolderRepository>().await;

        let first = make_folder("First", None);
        let second = make_folder("Second", None);
        let first_id = first.meta.element_id;
        let second_id = second.meta.element_id;
        folder_repository.create(first).await.unwrap();
        folder_repository.create(second).await.unwrap();
        service.trash_element(first_id).await.unwrap();
        service.trash_element(second_id).await.unwrap();

        // Act

        service.empty_trash().await.unwrap();

        // Assert

        assert!(service.list_trash().await.unwrap().is_empty());
        assert!(!meta_repository.exists(first_id).await.unwrap());
        assert!(!meta_repository.exists(second_id).await.unwrap());
    }

    #[tokio::test]
    async fn purge_expired_element_trashed_within_retention_keeps_element() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        service.trash_element(folder_id).await.unwrap();

        // Act

        let actual = service.purge_expired(30).await.unwrap();

        // Assert

        assert_eq!(0, actual);
        assert_eq!(1, service.list_trash().await.unwrap().len());
    }

    #[tokio::test]
    async fn purge_expired_element_trashed_past_retention_deletes_element() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let trash_repository = scope.resolve::<dyn TrashRepository>().await;
        let meta_repository = scope.resolve::<dyn MetaRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        trash_repository
            .trash(folder_id, Utc::now() - Duration::days(31))
            .await
            .unwrap();

        // Act

        let actual = service.purge_expired(30).await.unwrap();

        // Assert

        assert_eq!(1, actual);
        assert!(!meta_repository.exists(folder_id).await.unwrap());
    }

    #[tokio::test]
    async fn apply_state_incoming_state_is_older_than_local_keeps_local_state() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let trash_repository = scope.resolve::<dyn TrashRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        service.trash_element(folder_id).await.unwrap();

        let stale = TrashState {
            element_id: folder_id.id(),
            element_created_at: Utc::now(),
            trashed_at: None,
            trashed_root: false,
            trash_modified_at: DateTime::UNIX_EPOCH,
        };

        // Act

        let actual = trash_repository.apply_state(stale).await.unwrap();

        // Assert

        assert_eq!(0, actual);
        assert_eq!(1, service.list_trash().await.unwrap().len());
    }

    #[tokio::test]
    async fn apply_state_incoming_restore_is_newer_takes_element_out_of_trash() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let trash_repository = scope.resolve::<dyn TrashRepository>().await;

        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        service.trash_element(folder_id).await.unwrap();

        let restore = TrashState {
            element_id: folder_id.id(),
            element_created_at: Utc::now(),
            trashed_at: None,
            trashed_root: false,
            trash_modified_at: Utc::now() + Duration::minutes(1),
        };

        // Act

        let actual = trash_repository.apply_state(restore).await.unwrap();

        // Assert

        assert_eq!(1, actual);
        assert!(service.list_trash().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn get_states_modified_since_element_was_trashed_returns_its_state() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn TrashService>().await;
        let trash_repository = scope.resolve::<dyn TrashRepository>().await;

        let since = Utc::now() - Duration::minutes(1);
        let folder = make_folder("Science", None);
        let folder_id = folder.meta.element_id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        service.trash_element(folder_id).await.unwrap();

        // Act

        let actual = trash_repository
            .get_states_modified_since(since)
            .await
            .unwrap();

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!(folder_id.id(), actual[0].element_id);
        assert!(actual[0].trashed_at.is_some());
        assert!(actual[0].trashed_root);
    }
}
