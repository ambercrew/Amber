use crate::{
    Guid,
    cells::entities::{cell::Cell, repetition::Repetition, review::Review},
    common::extensions::into_datetime::IntoDateTime,
    file_system::{
        entities::{file::File, folder::Folder},
        value_objects::{
            file_system_item_name::FileSystemItemName, fsrs_profile_choice::FsrsProfileChoice,
        },
    },
    fsrs::entities::fsrs_profile::FsrsProfile,
    generated_code,
    sync::entities::{deleted_entity::DeletedEntity, synced_entity::SyncedEntity},
};

/// Decodes a raw [`SyncedEntity`] payload into a typed domain entity plus its
/// foreign-key reference metadata.
///
/// Each domain entity that can arrive over sync implements this trait with its
/// corresponding protobuf-generated type as [`DecodedEntity`]. The syncer calls
/// [`parse`] after base64-decoding and proto-decoding the payload, then uses the
/// returned [`ParseSyncedEntityOutput`] to apply the "delete wins" strategy before
/// persisting the entity.
pub trait ParseSyncedEntity {
    type DecodedEntity;

    fn parse(
        synced_entity: &SyncedEntity,
        decoded_entity: Self::DecodedEntity,
    ) -> ParseSyncedEntityOutput<Self>
    where
        Self: Sized;
}

/// The result of [`ParseSyncedEntity::parse`]: the constructed domain entity together
/// with the foreign-key references it depends on.
pub struct ParseSyncedEntityOutput<T> {
    pub entity: T,
    pub references: Vec<ParseSyncedEntityReference<T>>,
}

/// A callback used to patch an entity when one of its optional foreign-key references
/// was deleted locally (e.g. set a nullable field to `None`).
pub type RepairRemovedReferenceFn<T> = Box<dyn Fn(&mut T) + Send>;

/// A foreign-key dependency declared by a parsed entity.
///
/// - `id` — the ID of the referenced entity to look up in the deleted-entity log.
/// - `repair` — if `Some`, the reference is optional and this function patches the
///   entity when the dependency is missing. If `None`, the reference is mandatory and
///   a missing dependency causes the whole entity to be deleted.
pub struct ParseSyncedEntityReference<T> {
    pub id: Guid,
    pub repair: Option<RepairRemovedReferenceFn<T>>,
}

impl ParseSyncedEntity for FsrsProfile {
    type DecodedEntity = generated_code::FsrsProfile;

    fn parse(
        synced_entity: &SyncedEntity,
        decoded_entity: Self::DecodedEntity,
    ) -> ParseSyncedEntityOutput<Self> {
        let entity = FsrsProfile::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            decoded_entity.name,
            decoded_entity.request_retention,
            decoded_entity.maximum_interval,
            decoded_entity.weights,
        );

        #[cfg(debug_assertions)]
        log::info!("Parsed entity {:#?}", entity);

        ParseSyncedEntityOutput {
            entity,
            references: vec![],
        }
    }
}

impl ParseSyncedEntity for Folder {
    type DecodedEntity = generated_code::Folder;

    fn parse(
        synced_entity: &SyncedEntity,
        decoded_entity: Self::DecodedEntity,
    ) -> ParseSyncedEntityOutput<Self> {
        let entity = Folder::new_unchecked(
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

        #[cfg(debug_assertions)]
        log::info!("Parsed entity {:#?}", entity);

        let parent_id = entity.parent_id();
        let fsrs_choice = entity.fsrs_profile_choice();

        let mut references = Vec::new();
        if let Some(id) = parent_id {
            references.push(ParseSyncedEntityReference { id, repair: None });
        }
        if let FsrsProfileChoice::Id(id) = fsrs_choice {
            references.push(ParseSyncedEntityReference {
                id,
                repair: Some(Box::new(|entity: &mut Folder| {
                    entity.set_fsrs_profile_choice(FsrsProfileChoice::Inherit)
                })),
            });
        }

        ParseSyncedEntityOutput { entity, references }
    }
}

impl ParseSyncedEntity for File {
    type DecodedEntity = generated_code::File;

    fn parse(
        synced_entity: &SyncedEntity,
        decoded_entity: Self::DecodedEntity,
    ) -> ParseSyncedEntityOutput<Self> {
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

        #[cfg(debug_assertions)]
        log::info!("Parsed entity {:#?}", entity);

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
}

impl ParseSyncedEntity for Cell {
    type DecodedEntity = generated_code::Cell;

    fn parse(
        synced_entity: &SyncedEntity,
        decoded_entity: Self::DecodedEntity,
    ) -> ParseSyncedEntityOutput<Self> {
        let entity = Cell::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            Guid::parse_str(&decoded_entity.file_id).unwrap(),
            decoded_entity.content,
            serde_json::from_str(&decoded_entity.cell_type).unwrap(),
            decoded_entity.index,
            decoded_entity.searchable_content,
            Vec::new(),
        );

        #[cfg(debug_assertions)]
        log::info!("Parsed entity {:#?}", entity);

        let file_id = entity.file_id();
        ParseSyncedEntityOutput {
            entity,
            references: vec![ParseSyncedEntityReference {
                id: file_id,
                repair: None,
            }],
        }
    }
}

impl ParseSyncedEntity for Repetition {
    type DecodedEntity = generated_code::Repetition;

    fn parse(
        synced_entity: &SyncedEntity,
        decoded_entity: Self::DecodedEntity,
    ) -> ParseSyncedEntityOutput<Self> {
        let entity = Repetition::new_unchecked(
            synced_entity.entity_id,
            synced_entity.created_date,
            decoded_entity
                .modified_date
                .unwrap()
                .into_datetime()
                .unwrap(),
            Guid::parse_str(&decoded_entity.file_id).unwrap(),
            Guid::parse_str(&decoded_entity.cell_id).unwrap(),
            decoded_entity.due.unwrap().into_datetime().unwrap(),
            decoded_entity.stability,
            decoded_entity.difficulty,
            decoded_entity.elapsed_days,
            decoded_entity.scheduled_days,
            decoded_entity.reps,
            decoded_entity.lapses,
            serde_json::from_str(&decoded_entity.state).unwrap(),
            decoded_entity
                .last_review
                .and_then(|value| value.into_datetime()),
            decoded_entity.additional_content,
        );

        #[cfg(debug_assertions)]
        log::info!("Parsed entity {:#?}", entity);

        let file_id = entity.file_id();
        let cell_id = entity.cell_id();
        ParseSyncedEntityOutput {
            entity,
            references: vec![
                ParseSyncedEntityReference {
                    id: file_id,
                    repair: None,
                },
                ParseSyncedEntityReference {
                    id: cell_id,
                    repair: None,
                },
            ],
        }
    }
}

impl ParseSyncedEntity for Review {
    type DecodedEntity = generated_code::Review;

    fn parse(
        synced_entity: &SyncedEntity,
        decoded_entity: Self::DecodedEntity,
    ) -> ParseSyncedEntityOutput<Self> {
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

        #[cfg(debug_assertions)]
        log::info!("Parsed entity {:#?}", entity);

        let cell_id = entity.cell_id;
        let references = cell_id
            .map(|id| ParseSyncedEntityReference {
                id,
                repair: Some(Box::new(|entity: &mut Review| {
                    entity.cell_id = None;
                })),
            })
            .into_iter()
            .collect();

        ParseSyncedEntityOutput { entity, references }
    }
}

impl ParseSyncedEntity for DeletedEntity {
    type DecodedEntity = generated_code::DeletedEntity;

    fn parse(
        synced_entity: &SyncedEntity,
        decoded_entity: Self::DecodedEntity,
    ) -> ParseSyncedEntityOutput<Self> {
        let entity = DeletedEntity::new(
            synced_entity.entity_id,
            decoded_entity.entity_name,
            synced_entity.created_date,
            decoded_entity
                .deleted_date
                .unwrap()
                .into_datetime()
                .unwrap(),
        );

        #[cfg(debug_assertions)]
        log::info!("Parsed entity {:#?}", entity);

        ParseSyncedEntityOutput {
            entity,
            references: vec![],
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::*;

    use crate::{
        Guid,
        cells::entities::review::Rating,
        common::extensions::into_timestamp::IntoTimestamp,
        file_system::value_objects::fsrs_profile_choice::FsrsProfileChoice,
        generated_code,
        sync::entities::synced_entity::{EntityType, SyncedEntity},
    };

    use super::ParseSyncedEntity;

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

    // --- Folder ---

    #[test]
    fn parse_folder_with_fsrs_profile_id_reference_has_repair_fn() {
        // Arrange

        let synced_entity = make_synced_entity(EntityType::Folder);
        let fsrs_profile_id = Guid::new_v4();
        let decoded = generated_code::Folder {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My Folder".to_string(),
            parent_id: None,
            fsrs_profile_id: Some(fsrs_profile_id.to_string()),
        };

        // Act

        let output = Folder::parse(&synced_entity, decoded);

        // Assert

        assert_eq!(1, output.references.len());
        assert_eq!(fsrs_profile_id, output.references[0].id);
        assert!(output.references[0].repair.is_some());
    }

    #[test]
    fn parse_folder_with_fsrs_profile_id_repair_fn_sets_choice_to_inherit() {
        // Arrange

        let synced_entity = make_synced_entity(EntityType::Folder);
        let decoded = generated_code::Folder {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My Folder".to_string(),
            parent_id: None,
            fsrs_profile_id: Some(Guid::new_v4().to_string()),
        };
        let mut output = Folder::parse(&synced_entity, decoded);
        let repair = output.references[0].repair.as_ref().unwrap();

        // Act

        repair(&mut output.entity);

        // Assert

        assert_eq!(
            FsrsProfileChoice::Inherit,
            output.entity.fsrs_profile_choice()
        );
    }

    #[test]
    fn parse_folder_without_fsrs_profile_id_has_no_references() {
        // Arrange

        let synced_entity = make_synced_entity(EntityType::Folder);
        let decoded = generated_code::Folder {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My Folder".to_string(),
            parent_id: None,
            fsrs_profile_id: None,
        };

        // Act

        let output = Folder::parse(&synced_entity, decoded);

        // Assert

        assert!(output.references.is_empty());
    }

    // --- File ---

    #[test]
    fn parse_file_with_fsrs_profile_id_reference_has_repair_fn() {
        // Arrange

        let synced_entity = make_synced_entity(EntityType::File);
        let fsrs_profile_id = Guid::new_v4();
        let decoded = generated_code::File {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My File".to_string(),
            parent_id: None,
            fsrs_profile_id: Some(fsrs_profile_id.to_string()),
        };

        // Act

        let output = File::parse(&synced_entity, decoded);

        // Assert

        assert_eq!(1, output.references.len());
        assert_eq!(fsrs_profile_id, output.references[0].id);
        assert!(output.references[0].repair.is_some());
    }

    #[test]
    fn parse_file_with_fsrs_profile_id_repair_fn_sets_choice_to_inherit() {
        // Arrange

        let synced_entity = make_synced_entity(EntityType::File);
        let decoded = generated_code::File {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My File".to_string(),
            parent_id: None,
            fsrs_profile_id: Some(Guid::new_v4().to_string()),
        };
        let mut output = File::parse(&synced_entity, decoded);
        let repair = output.references[0].repair.as_ref().unwrap();

        // Act

        repair(&mut output.entity);

        // Assert

        assert_eq!(
            FsrsProfileChoice::Inherit,
            output.entity.fsrs_profile_choice()
        );
    }

    #[test]
    fn parse_file_without_fsrs_profile_id_has_no_references() {
        // Arrange

        let synced_entity = make_synced_entity(EntityType::File);
        let decoded = generated_code::File {
            modified_date: Some(Utc::now().into_timestamp()),
            name: "My File".to_string(),
            parent_id: None,
            fsrs_profile_id: None,
        };

        // Act

        let output = File::parse(&synced_entity, decoded);

        // Assert

        assert!(output.references.is_empty());
    }

    // --- Review ---

    #[test]
    fn parse_review_with_cell_id_reference_has_repair_fn() {
        // Arrange

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

        let output = Review::parse(&synced_entity, decoded);

        // Assert

        assert_eq!(1, output.references.len());
        assert_eq!(cell_id, output.references[0].id);
        assert!(output.references[0].repair.is_some());
    }

    #[test]
    fn parse_review_with_cell_id_repair_fn_sets_cell_id_to_none() {
        // Arrange

        let synced_entity = make_synced_entity(EntityType::Review);
        let decoded = generated_code::Review {
            modified_date: Some(Utc::now().into_timestamp()),
            cell_id: Some(Guid::new_v4().to_string()),
            study_time: 30,
            date: Some(Utc::now().into_timestamp()),
            rating: serde_json::to_string(&Rating::Good).unwrap(),
        };
        let mut output = Review::parse(&synced_entity, decoded);
        let repair = output.references[0].repair.as_ref().unwrap();

        // Act

        repair(&mut output.entity);

        // Assert

        assert!(output.entity.cell_id.is_none());
    }

    #[test]
    fn parse_review_without_cell_id_has_no_references() {
        // Arrange

        let synced_entity = make_synced_entity(EntityType::Review);
        let decoded = generated_code::Review {
            modified_date: Some(Utc::now().into_timestamp()),
            cell_id: None,
            study_time: 30,
            date: Some(Utc::now().into_timestamp()),
            rating: serde_json::to_string(&Rating::Good).unwrap(),
        };

        // Act

        let output = Review::parse(&synced_entity, decoded);

        // Assert

        assert!(output.references.is_empty());
    }
}
