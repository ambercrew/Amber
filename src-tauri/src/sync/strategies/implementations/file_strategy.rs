use std::sync::Arc;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use injector_derive::ScopeInjectable;

use crate::{
    Guid,
    backend::backend_dto::SyncEntityDto,
    common::extensions::{
        into_base64::IntoBase64, into_datetime::IntoDateTime, into_timestamp::IntoTimestamp,
    },
    file_system::{
        entities::file::File,
        repositories::file_repository::FileRepository,
        value_objects::{
            file_system_item_name::FileSystemItemName, fsrs_profile_choice::FsrsProfileChoice,
        },
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
pub struct DefaultFileStrategy {
    file_repository: Arc<dyn FileRepository>,
}

#[async_trait]
impl SyncEntityStrategy for DefaultFileStrategy {
    type Input = generated_code::File;
    type Entity = File;

    fn parse(
        &self,
        synced_entity: &SyncedEntity,
        decoded_entity: Self::Input,
    ) -> ParseSyncedEntityOutput<Self::Entity> {
        let entity = File::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            decoded_entity
                .parent_id
                .map(|val| Guid::parse_str(&val).unwrap()),
            FileSystemItemName::new_unchecked(decoded_entity.name),
            decoded_entity.fsrs_profile_id.into(),
        );

        let parent_id = entity.parent_id();
        let fsrs_choice = entity.fsrs_profile_choice();

        let mut references = Vec::new();
        if let Some(id) = parent_id {
            references.push(ParseSyncedEntityReference { id, repair: None });
        }
        if let FsrsProfileChoice::Id(id) = fsrs_choice {
            references.push(ParseSyncedEntityReference {
                id,
                repair: Some(Box::new(|entity: &mut File| {
                    entity.set_fsrs_profile_choice(FsrsProfileChoice::Inherit)
                })),
            });
        }

        ParseSyncedEntityOutput { entity, references }
    }

    async fn upsert(&self, entity: Self::Entity) -> Result<u64, SyncEntityStrategyError> {
        self.file_repository
            .upsert_with_modified_date_if_modified_before(&entity, entity.modified_date())
            .await
            .map_err(Into::into)
    }

    async fn get_sync_dtos_modified_since(
        &self,
        since: DateTime<Utc>,
    ) -> Result<Vec<SyncEntityDto>, SyncEntityStrategyError> {
        let files = self
            .file_repository
            .get_all_modified_on_or_after(since)
            .await?;
        Ok(files
            .into_iter()
            .map(|f| SyncEntityDto {
                entity_id: f.id(),
                created_date: f.created_date(),
                entity_type: EntityType::File,
                data: generated_code::File {
                    modified_date: Some(f.modified_date().into_timestamp()),
                    name: f.name().to_string(),
                    parent_id: f.parent_id().map(|value| value.into()),
                    fsrs_profile_id: Option::<Guid>::from(f.fsrs_profile_choice())
                        .map(|id| id.into()),
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
        common::extensions::into_timestamp::IntoTimestamp,
        file_system::{
            entities::file::File, repositories::file_repository::FileRepository,
            value_objects::fsrs_profile_choice::FsrsProfileChoice,
        },
        generated_code,
        infrastructure::repositories::sqlite::sqlite_file_repository::SqliteFileRepository,
        sync::{
            entities::synced_entity::{EntityType, SyncedEntity},
            strategies::sync_entity_strategy::SyncEntityStrategy,
        },
        test_utils::create_test_injector,
    };

    async fn make_strategy()
    -> Arc<dyn SyncEntityStrategy<Input = generated_code::File, Entity = File>> {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn FileRepository, SqliteFileRepository);
        register_scope!(
            injector,
            dyn SyncEntityStrategy<Input = generated_code::File, Entity = File>,
            DefaultFileStrategy
        );
        injector
            .start_scope()
            .resolve::<dyn SyncEntityStrategy<Input = generated_code::File, Entity = File>>()
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
    async fn parse_with_fsrs_profile_id_reference_has_repair_fn() {
        // Arrange

        let strategy = make_strategy().await;
        let synced_entity = make_synced_entity(EntityType::File);
        let fsrs_profile_id = Guid::new_v4();
        let decoded = generated_code::File {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My File".to_string(),
            parent_id: None,
            fsrs_profile_id: Some(fsrs_profile_id.to_string()),
        };

        // Act

        let output = strategy.parse(&synced_entity, decoded);

        // Assert

        assert_eq!(1, output.references.len());
        assert_eq!(fsrs_profile_id, output.references[0].id);
        assert!(output.references[0].repair.is_some());
    }

    #[tokio::test]
    async fn parse_with_fsrs_profile_id_repair_fn_sets_choice_to_inherit() {
        // Arrange

        let strategy = make_strategy().await;
        let synced_entity = make_synced_entity(EntityType::File);
        let decoded = generated_code::File {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My File".to_string(),
            parent_id: None,
            fsrs_profile_id: Some(Guid::new_v4().to_string()),
        };
        let mut output = strategy.parse(&synced_entity, decoded);
        let repair = output.references[0].repair.as_ref().unwrap();

        // Act

        repair(&mut output.entity);

        // Assert

        assert_eq!(
            FsrsProfileChoice::Inherit,
            output.entity.fsrs_profile_choice()
        );
    }

    #[tokio::test]
    async fn parse_without_fsrs_profile_id_has_no_references() {
        // Arrange

        let strategy = make_strategy().await;
        let synced_entity = make_synced_entity(EntityType::File);
        let decoded = generated_code::File {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My File".to_string(),
            parent_id: None,
            fsrs_profile_id: None,
        };

        // Act

        let output = strategy.parse(&synced_entity, decoded);

        // Assert

        assert!(output.references.is_empty());
    }
}
