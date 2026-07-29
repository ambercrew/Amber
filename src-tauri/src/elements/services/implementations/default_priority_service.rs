use std::sync::Arc;

use async_trait::async_trait;
use fractional_index::FractionalIndex;
use injector_derive::ScopeInjectable;

use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::services::priority_service::{PriorityError, PriorityInfo, PriorityService};
use crate::elements::value_objects::element_id::ElementId;

#[derive(ScopeInjectable)]
pub struct DefaultPriorityService {
    meta_repository: Arc<dyn MetaRepository>,
}

#[async_trait]
impl PriorityService for DefaultPriorityService {
    async fn get_new_first_priority(&self) -> Result<FractionalIndex, PriorityError> {
        let first = self.meta_repository.get_first_priority().await?;
        Ok(first
            .map(|p| FractionalIndex::new_before(&p))
            .unwrap_or_default())
    }

    async fn get_inherited_priority(
        &self,
        bibliographical_source_id: ElementId,
    ) -> Result<FractionalIndex, PriorityError> {
        match self
            .try_get_inherited_priority(bibliographical_source_id)
            .await
        {
            Err(PriorityError::PriorityExhausted) => {
                self.rebalance_priorities().await?;
                self.try_get_inherited_priority(bibliographical_source_id)
                    .await
            }
            other => other,
        }
    }

    async fn get_priority_info(&self, id: ElementId) -> Result<PriorityInfo, PriorityError> {
        let total = self.meta_repository.count_all().await?;
        let ranked_ahead = self.meta_repository.count_with_lower_priority(id).await?;
        let rank = ranked_ahead + 1;
        let percentage = if total <= 1 {
            0.0
        } else {
            (ranked_ahead as f64) / ((total - 1) as f64) * 100.0
        };
        Ok(PriorityInfo {
            rank,
            total,
            percentage,
        })
    }

    async fn set_priority_by_rank(&self, id: ElementId, rank: i64) -> Result<(), PriorityError> {
        match self.try_set_priority_by_rank(id, rank).await {
            Err(PriorityError::PriorityExhausted) => {
                self.rebalance_priorities().await?;
                self.try_set_priority_by_rank(id, rank).await
            }
            other => other,
        }
    }

    async fn set_priority_by_percentage(
        &self,
        id: ElementId,
        percentage: f64,
    ) -> Result<(), PriorityError> {
        let total = self.meta_repository.count_all().await?;
        if total <= 1 {
            return Ok(());
        }
        let clamped = percentage.clamp(0.0, 100.0);
        let rank_zero_based = (clamped / 100.0 * (total - 1) as f64).round() as i64;
        self.set_priority_by_rank(id, rank_zero_based + 1).await
    }
}

impl DefaultPriorityService {
    /// Two elements can end up with the same priority (e.g. a duplicate
    /// introduced by sync), which leaves no midpoint between them. Surface
    /// that as `PriorityExhausted` rather than silently reusing a key, so
    /// callers rebalance instead of masking the collision.
    async fn try_get_inherited_priority(
        &self,
        bibliographical_source_id: ElementId,
    ) -> Result<FractionalIndex, PriorityError> {
        let source = self
            .meta_repository
            .get_by_id(bibliographical_source_id.id())
            .await?;
        let previous = self
            .meta_repository
            .get_previous_by_priority(&source)
            .await?;
        let priority = match previous {
            Some(previous) => FractionalIndex::new_between(&previous.priority, &source.priority)
                .ok_or(PriorityError::PriorityExhausted)?,
            None => FractionalIndex::new_before(&source.priority),
        };
        Ok(priority)
    }

    async fn try_set_priority_by_rank(
        &self,
        id: ElementId,
        rank: i64,
    ) -> Result<(), PriorityError> {
        let total = self.meta_repository.count_all().await?;
        if total == 0 {
            return Ok(());
        }
        let clamped_rank = rank.clamp(1, total);
        let others_total = total - 1;
        let index = (clamped_rank - 1).min(others_total);

        let before = if index > 0 {
            self.meta_repository
                .get_at_priority_offset(id, index - 1)
                .await?
        } else {
            None
        };
        let after = self
            .meta_repository
            .get_at_priority_offset(id, index)
            .await?;

        let new_priority = match (&before, &after) {
            (Some(before), Some(after)) => {
                FractionalIndex::new_between(&before.priority, &after.priority)
                    .ok_or(PriorityError::PriorityExhausted)?
            }
            (Some(before), None) => FractionalIndex::new_after(&before.priority),
            (None, Some(after)) => FractionalIndex::new_before(&after.priority),
            (None, None) => FractionalIndex::default(),
        };

        self.meta_repository.set_priority(id, new_priority).await?;
        Ok(())
    }

    async fn rebalance_priorities(&self) -> Result<(), PriorityError> {
        let ordered = self.meta_repository.get_all_ordered_by_priority().await?;
        let mut priority = FractionalIndex::default();
        for meta in ordered {
            self.meta_repository
                .set_priority(meta.element_id, priority.clone())
                .await?;
            priority = FractionalIndex::new_after(&priority);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};
    use uuid::Uuid;

    use crate::{
        elements::{
            entities::folder::Folder,
            repositories::{folder_repository::FolderRepository, meta_repository::MetaRepository},
            value_objects::{element_id::ElementId, meta::Meta},
        },
        infrastructure::{
            repositories::sqlite::{
                sqlite_folder_repository::SqliteFolderRepository,
                sqlite_meta_repository::SqliteMetaRepository,
            },
            value_objects::db_transaction::DbTransaction,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(injector, dyn PriorityService, DefaultPriorityService);
        injector
    }

    fn make_folder(priority: FractionalIndex) -> Folder {
        Folder {
            meta: Meta {
                element_id: ElementId::Folder(Uuid::new_v4()),
                name: "test".into(),
                parent: None,
                position: FractionalIndex::default(),
                priority,
                study_profile_id: None,
                bibliographical_source_id: None,
                derived_from: None,
                created_at: Utc::now(),
                modified_at: Utc::now(),
            },
        }
    }

    #[tokio::test]
    async fn get_new_first_priority_empty_returns_default() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;

        // Act

        let actual = service.get_new_first_priority().await.unwrap();

        // Assert

        assert_eq!(FractionalIndex::default(), actual);
    }

    #[tokio::test]
    async fn get_new_first_priority_with_existing_returns_before_first() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let existing = make_folder(FractionalIndex::default());
        folder_repo.create(existing).await.unwrap();

        // Act

        let actual = service.get_new_first_priority().await.unwrap();

        // Assert

        assert!(actual < FractionalIndex::default());
    }

    #[tokio::test]
    async fn get_inherited_priority_source_with_no_previous_returns_before_source() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let source = make_folder(FractionalIndex::default());
        let bibliographical_source_id = source.meta.element_id;
        folder_repo.create(source).await.unwrap();

        // Act

        let actual = service
            .get_inherited_priority(bibliographical_source_id)
            .await
            .unwrap();

        // Assert

        assert!(actual < FractionalIndex::default());
    }

    #[tokio::test]
    async fn get_inherited_priority_source_with_previous_returns_between_previous_and_source() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let previous_priority = FractionalIndex::default();
        let source_priority = FractionalIndex::new_after(&previous_priority);
        let previous = make_folder(previous_priority.clone());
        let source = make_folder(source_priority.clone());
        let bibliographical_source_id = source.meta.element_id;
        folder_repo.create(previous).await.unwrap();
        folder_repo.create(source).await.unwrap();

        // Act

        let actual = service
            .get_inherited_priority(bibliographical_source_id)
            .await
            .unwrap();

        // Assert

        assert!(actual > previous_priority);
        assert!(actual < source_priority);
    }

    #[tokio::test]
    async fn get_priority_info_single_element_is_rank_one_zero_percent() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let folder = make_folder(FractionalIndex::default());
        let id = folder.meta.element_id;
        folder_repo.create(folder).await.unwrap();

        // Act

        let info = service.get_priority_info(id).await.unwrap();

        // Assert

        assert_eq!(1, info.rank);
        assert_eq!(1, info.total);
        assert_eq!(0.0, info.percentage);
    }

    #[tokio::test]
    async fn get_priority_info_last_of_three_is_hundred_percent() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let pos_a = FractionalIndex::default();
        let pos_b = FractionalIndex::new_after(&pos_a);
        let pos_c = FractionalIndex::new_after(&pos_b);
        let a = make_folder(pos_a);
        let b = make_folder(pos_b);
        let c = make_folder(pos_c);
        let c_id = c.meta.element_id;
        folder_repo.create(a).await.unwrap();
        folder_repo.create(b).await.unwrap();
        folder_repo.create(c).await.unwrap();

        // Act

        let info = service.get_priority_info(c_id).await.unwrap();

        // Assert

        assert_eq!(3, info.rank);
        assert_eq!(3, info.total);
        assert_eq!(100.0, info.percentage);
    }

    #[tokio::test]
    async fn set_priority_by_rank_moves_element_to_front() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;

        let pos_a = FractionalIndex::default();
        let pos_b = FractionalIndex::new_after(&pos_a);
        let a = make_folder(pos_a);
        let b = make_folder(pos_b);
        let a_id = a.meta.element_id;
        let b_id = b.meta.element_id;
        folder_repo.create(a).await.unwrap();
        folder_repo.create(b).await.unwrap();

        // Act — move B (currently rank 2) to rank 1

        service.set_priority_by_rank(b_id, 1).await.unwrap();

        // Assert

        let a_meta = meta_repo.get_by_id(a_id.id()).await.unwrap();
        let b_meta = meta_repo.get_by_id(b_id.id()).await.unwrap();
        assert!(b_meta.priority < a_meta.priority);
    }

    #[tokio::test]
    async fn set_priority_by_percentage_moves_element_to_middle() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;

        let pos_a = FractionalIndex::default();
        let pos_b = FractionalIndex::new_after(&pos_a);
        let pos_c = FractionalIndex::new_after(&pos_b);
        let a = make_folder(pos_a);
        let b = make_folder(pos_b);
        let c = make_folder(pos_c);
        let a_id = a.meta.element_id;
        folder_repo.create(a).await.unwrap();
        folder_repo.create(b).await.unwrap();
        folder_repo.create(c).await.unwrap();

        // Act — move A (currently rank 1) to 50%, which lands it at rank 2

        service
            .set_priority_by_percentage(a_id, 50.0)
            .await
            .unwrap();

        // Assert

        let info = service.get_priority_info(a_id).await.unwrap();
        assert_eq!(2, info.rank);
    }

    #[tokio::test]
    async fn get_inherited_priority_previous_and_source_exhausted_rebalances_and_succeeds() {
        // Arrange — create three folders, then exhaust the space between the
        // first two via direct SQL so no key can fit strictly between them.

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn PriorityService>().await;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        let meta_repo = scope.resolve::<dyn MetaRepository>().await;
        let tx = scope.resolve::<DbTransaction>().await;

        let previous = make_folder(FractionalIndex::default());
        let source = make_folder(FractionalIndex::new_after(&FractionalIndex::default()));
        let other = make_folder(FractionalIndex::new_after(&FractionalIndex::new_after(
            &FractionalIndex::default(),
        )));
        let previous_id = previous.meta.element_id.id();
        let bibliographical_source_id = source.meta.element_id;
        let other_id = other.meta.element_id;
        folder_repo.create(previous).await.unwrap();
        folder_repo.create(source).await.unwrap();
        folder_repo.create(other).await.unwrap();

        let adjacent_before = FractionalIndex::from_bytes(vec![127, 128]).unwrap();
        let adjacent_after = FractionalIndex::from_bytes(vec![128, 128]).unwrap();
        {
            let mut guard = tx.lock().await;
            let tx_ref = guard.as_mut();
            sqlx::query!(
                "UPDATE meta SET priority = $1 WHERE element_id = $2",
                adjacent_before.as_bytes(),
                previous_id
            )
            .execute(&mut *tx_ref)
            .await
            .unwrap();
            sqlx::query!(
                "UPDATE meta SET priority = $1 WHERE element_id = $2",
                adjacent_after.as_bytes(),
                bibliographical_source_id.id()
            )
            .execute(&mut *tx_ref)
            .await
            .unwrap();
        }

        // Act — the priority between previous and source is exhausted, so
        // the service must rebalance every priority before succeeding.

        let inherited = service
            .get_inherited_priority(bibliographical_source_id)
            .await
            .unwrap();

        // Assert — the new priority is a distinct key strictly between the
        // (rebalanced) previous and source, and overall order is preserved.

        let previous_meta = meta_repo.get_by_id(previous_id).await.unwrap();
        let source_meta = meta_repo
            .get_by_id(bibliographical_source_id.id())
            .await
            .unwrap();
        let other_meta = meta_repo.get_by_id(other_id.id()).await.unwrap();
        assert!(previous_meta.priority < inherited);
        assert!(inherited < source_meta.priority);
        assert!(source_meta.priority < other_meta.priority);
    }
}
