use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    backend::backend_dto::SyncEntityDto,
    cells::{entities::review::Review, repositories::review_repository::ReviewRepository},
    common::extensions::{
        into_base64::IntoBase64, into_datetime::IntoDateTime, into_timestamp::IntoTimestamp,
    },
    generated_code,
    sync::{
        entities::synced_entity::{EntityType, SyncedEntity},
        strategies::sync_entity_strategy::{
            ParseSyncedEntityOutput, ParseSyncedEntityReference, SyncEntityStrategy,
            SyncEntityStrategyError,
        },
    },
};

#[derive(ScopeInjectable)]
pub struct DefaultReviewStrategy {
    review_repository: Arc<dyn ReviewRepository>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultReviewStrategy {
    type Input = generated_code::Review;
    type Entity = Review;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = Review::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            decoded_entity
                .cell_id
                .map(|value| Guid::parse_str(&value).unwrap()),
            decoded_entity.study_time,
            decoded_entity.date.unwrap().into_datetime().unwrap(),
            serde_json::from_str(&decoded_entity.rating).unwrap(),
        );

        let cell_id = entity.cell_id;
        let references = cell_id
            .map(|id| ParseSyncedEntityReference {
                id,
                repair: Some(Box::new(|entity: &mut Review| {
                    entity.cell_id = None;
                }) as Box<dyn Fn(&mut Review) + Send>),
            })
            .into_iter()
            .collect();

        ParseSyncedEntityOutput { entity, references }
    }

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError> {
        self.review_repository
            .upsert_with_modified_date_if_modified_before(&entity, entity.modified_date)
            .await
            .map_err(Into::into)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let reviews = self
            .review_repository
            .get_all_modified_on_or_after(since)
            .await?;
        Ok(reviews
            .into_iter()
            .map(|r| SyncEntityDto {
                entity_id: r.id,
                created_date: r.created_date,
                entity_type: EntityType::Review,
                data: generated_code::Review {
                    modified_date: Some(r.modified_date.into_timestamp()),
                    cell_id: r.cell_id.map(|value| value.to_string()),
                    date: Some(r.date.into_timestamp()),
                    rating: serde_json::to_string(&r.rating).unwrap(),
                    study_time: r.study_time,
                }
                .into_base64(),
            })
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use injector::register_scope;

    use super::*;

    use crate::{
        Guid,
        cells::{
            entities::review::{Rating, Review},
            repositories::review_repository::ReviewRepository,
        },
        common::extensions::into_timestamp::IntoTimestamp,
        generated_code,
        infrastructure::repositories::sqlite::sqlite_review_repository::SqliteReviewRepository,
        sync::{
            entities::synced_entity::{EntityType, SyncedEntity},
            strategies::sync_entity_strategy::SyncEntityStrategy,
        },
        test_utils::create_test_injector,
    };

    async fn make_strategy()
    -> Arc<dyn SyncEntityStrategy<Input = generated_code::Review, Entity = Review>> {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn ReviewRepository, SqliteReviewRepository);
        register_scope!(
            injector,
            dyn SyncEntityStrategy<Input = generated_code::Review, Entity = Review>,
            DefaultReviewStrategy
        );
        injector
            .start_scope()
            .resolve::<dyn SyncEntityStrategy<Input = generated_code::Review, Entity = Review>>()
            .await
    }

    fn make_synced_entity(entity_type: EntityType) -> SyncedEntity {
        SyncedEntity {
            user_id: Guid::new_v4(),
            entity_id: Guid::new_v4(),
            created_date: Utc::now(),
            last_sync_date: Utc::now(),
            entity_type,
            data: String::new(),
        }
    }

    #[tokio::test]
    async fn parse_with_cell_id_reference_has_repair_fn() {
        // Arrange

        let strategy = make_strategy().await;
        let synced_entity = make_synced_entity(EntityType::Review);
        let cell_id = Guid::new_v4();
        let decoded = generated_code::Review {
            modified_date: Some(Utc::now().into_timestamp()),
            cell_id: Some(cell_id.to_string()),
            study_time: 30,
            date: Some(Utc::now().into_timestamp()),
            rating: serde_json::to_string(&Rating::Good).unwrap(),
        };

        // Act

        let output = strategy.parse(&synced_entity, decoded);

        // Assert

        assert_eq!(1, output.references.len());
        assert_eq!(cell_id, output.references[0].id);
        assert!(output.references[0].repair.is_some());
    }

    #[tokio::test]
    async fn parse_with_cell_id_repair_fn_sets_cell_id_to_none() {
        // Arrange

        let strategy = make_strategy().await;
        let synced_entity = make_synced_entity(EntityType::Review);
        let decoded = generated_code::Review {
            modified_date: Some(Utc::now().into_timestamp()),
            cell_id: Some(Guid::new_v4().to_string()),
            study_time: 30,
            date: Some(Utc::now().into_timestamp()),
            rating: serde_json::to_string(&Rating::Good).unwrap(),
        };
        let mut output = strategy.parse(&synced_entity, decoded);
        let repair = output.references[0].repair.as_ref().unwrap();

        // Act

        repair(&mut output.entity);

        // Assert

        assert!(output.entity.cell_id.is_none());
    }

    #[tokio::test]
    async fn parse_without_cell_id_has_no_references() {
        // Arrange

        let strategy = make_strategy().await;
        let synced_entity = make_synced_entity(EntityType::Review);
        let decoded = generated_code::Review {
            modified_date: Some(Utc::now().into_timestamp()),
            cell_id: None,
            study_time: 30,
            date: Some(Utc::now().into_timestamp()),
            rating: serde_json::to_string(&Rating::Good).unwrap(),
        };

        // Act

        let output = strategy.parse(&synced_entity, decoded);

        // Assert

        assert!(output.references.is_empty());
    }
}
