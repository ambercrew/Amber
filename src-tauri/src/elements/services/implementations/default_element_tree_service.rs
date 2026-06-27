use std::collections::HashMap;
use std::hash::Hash;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::dto::tree_dto::{CardNodeDto, ExtractNodeDto, FolderNodeDto, ReadingNodeDto};
use crate::elements::entities::card::Card;
use crate::elements::entities::extract::Extract;
use crate::elements::entities::folder::Folder;
use crate::elements::entities::reading::Reading;
use crate::elements::entities::traits::{Element, Tagged};
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::services::element_tree_service::ElementTreeService;
use crate::elements::value_objects::card_parent::CardParent;
use crate::elements::value_objects::extract_parent::ExtractParent;

#[derive(ScopeInjectable)]
pub struct DefaultElementTreeService {
    folder_repository: Arc<dyn FolderRepository>,
    reading_repository: Arc<dyn ReadingRepository>,
    extract_repository: Arc<dyn ExtractRepository>,
    card_repository: Arc<dyn CardRepository>,
}

#[async_trait]
impl ElementTreeService for DefaultElementTreeService {
    async fn get_element_tree(&self) -> Result<Vec<FolderNodeDto>, RepositoryError> {
        let folders = self.folder_repository.get_all().await?;
        let readings = self.reading_repository.get_all().await?;
        let extracts = self.extract_repository.get_all().await?;
        let cards = self.card_repository.get_all().await?;

        let folders_by_parent =
            group_by_parent_and_sort_by_position(folders, |f| f.parent_folder_id);
        let readings_by_folder = group_by_parent_and_sort_by_position(readings, |r| r.folder_id);
        let extracts_by_parent = group_by_parent_and_sort_by_position(extracts, |e| e.parent);
        let cards_by_parent = group_by_parent_and_sort_by_position(cards, |c| c.parent);

        let empty_folders: Vec<Folder> = vec![];
        let root_folders = folders_by_parent.get(&None).unwrap_or(&empty_folders);

        Ok(root_folders
            .iter()
            .map(|folder| {
                build_folder_node(
                    folder,
                    &folders_by_parent,
                    &readings_by_folder,
                    &extracts_by_parent,
                    &cards_by_parent,
                )
            })
            .collect())
    }
}

fn group_by_parent_and_sort_by_position<K, V, F>(items: Vec<V>, get_parent: F) -> HashMap<K, Vec<V>>
where
    K: Eq + Hash,
    V: Element,
    F: Fn(&V) -> K,
{
    let mut map: HashMap<K, Vec<V>> = HashMap::new();
    for item in items {
        map.entry(get_parent(&item)).or_default().push(item);
    }
    for group in map.values_mut() {
        group.sort_by_key(|v| v.meta().position);
    }
    map
}

fn tag_strings(tagged: &impl Tagged) -> Vec<String> {
    tagged.tags().iter().map(|t| t.to_string()).collect()
}

fn build_folder_node(
    folder: &Folder,
    folders_by_parent: &HashMap<Option<Uuid>, Vec<Folder>>,
    readings_by_folder: &HashMap<Uuid, Vec<Reading>>,
    extracts_by_parent: &HashMap<ExtractParent, Vec<Extract>>,
    cards_by_parent: &HashMap<CardParent, Vec<Card>>,
) -> FolderNodeDto {
    let meta = folder.meta();
    let id = meta.id;

    FolderNodeDto {
        id: id.to_string(),
        name: meta.name.clone(),
        position: meta.position,
        tags: tag_strings(folder),
        folders: folders_by_parent
            .get(&Some(id))
            .map(|children| {
                children
                    .iter()
                    .map(|child| {
                        build_folder_node(
                            child,
                            folders_by_parent,
                            readings_by_folder,
                            extracts_by_parent,
                            cards_by_parent,
                        )
                    })
                    .collect()
            })
            .unwrap_or_default(),
        readings: readings_by_folder
            .get(&id)
            .map(|rs| {
                rs.iter()
                    .map(|r| build_reading_node(r, extracts_by_parent, cards_by_parent))
                    .collect()
            })
            .unwrap_or_default(),
        extracts: collect_extracts(
            ExtractParent::Folder(id),
            extracts_by_parent,
            cards_by_parent,
        ),
        cards: collect_cards(CardParent::Folder(id), cards_by_parent),
    }
}

fn build_reading_node(
    reading: &Reading,
    extracts_by_parent: &HashMap<ExtractParent, Vec<Extract>>,
    cards_by_parent: &HashMap<CardParent, Vec<Card>>,
) -> ReadingNodeDto {
    ReadingNodeDto {
        id: reading.meta.id.to_string(),
        name: reading.meta.name.clone(),
        position: reading.meta.position,
        tags: tag_strings(reading),
        extracts: collect_extracts(
            ExtractParent::Reading(reading.meta.id),
            extracts_by_parent,
            cards_by_parent,
        ),
        cards: collect_cards(CardParent::Reading(reading.meta.id), cards_by_parent),
    }
}

fn collect_extracts(
    parent: ExtractParent,
    extracts_by_parent: &HashMap<ExtractParent, Vec<Extract>>,
    cards_by_parent: &HashMap<CardParent, Vec<Card>>,
) -> Vec<ExtractNodeDto> {
    extracts_by_parent
        .get(&parent)
        .map(|es| {
            es.iter()
                .map(|e| build_extract_node(e, extracts_by_parent, cards_by_parent))
                .collect()
        })
        .unwrap_or_default()
}

fn build_extract_node(
    extract: &Extract,
    extracts_by_parent: &HashMap<ExtractParent, Vec<Extract>>,
    cards_by_parent: &HashMap<CardParent, Vec<Card>>,
) -> ExtractNodeDto {
    ExtractNodeDto {
        id: extract.meta.id.to_string(),
        name: extract.meta.name.clone(),
        position: extract.meta.position,
        text: extract.text.clone(),
        tags: tag_strings(extract),
        extracts: collect_extracts(
            ExtractParent::Extract(extract.meta.id),
            extracts_by_parent,
            cards_by_parent,
        ),
        cards: collect_cards(CardParent::Extract(extract.meta.id), cards_by_parent),
    }
}

fn collect_cards(
    parent: CardParent,
    cards_by_parent: &HashMap<CardParent, Vec<Card>>,
) -> Vec<CardNodeDto> {
    cards_by_parent
        .get(&parent)
        .map(|cs| {
            cs.iter()
                .map(|card| CardNodeDto {
                    id: card.meta.id.to_string(),
                    name: card.meta.name.clone(),
                    position: card.meta.position,
                    front: card.front.clone(),
                    back: card.back.clone(),
                    tags: tag_strings(card),
                })
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};
    use uuid::Uuid;

    use crate::{
        elements::{
            entities::{
                card::Card,
                extract::Extract,
                folder::Folder,
                reading::{Reading, ReadingSource},
            },
            repositories::{
                card_repository::CardRepository, extract_repository::ExtractRepository,
                folder_repository::FolderRepository, reading_repository::ReadingRepository,
            },
            services::element_tree_service::ElementTreeService,
            value_objects::meta::Meta,
        },
        infrastructure::{
            repositories::sqlite::{
                sqlite_card_repository::SqliteCardRepository,
                sqlite_extract_repository::SqliteExtractRepository,
                sqlite_folder_repository::SqliteFolderRepository,
                sqlite_reading_repository::SqliteReadingRepository,
            },
            value_objects::db_transaction::DbTransaction,
        },
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;

        register_scope!(injector, dyn FolderRepository, SqliteFolderRepository);
        register_scope!(injector, dyn ReadingRepository, SqliteReadingRepository);
        register_scope!(injector, dyn ExtractRepository, SqliteExtractRepository);
        register_scope!(injector, dyn CardRepository, SqliteCardRepository);
        register_scope!(injector, dyn ElementTreeService, DefaultElementTreeService);

        injector
    }

    #[tokio::test]
    async fn get_element_tree_empty_database_returns_empty_vec() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        assert!(actual.is_empty());
    }

    #[tokio::test]
    async fn get_element_tree_single_root_folder_returns_folder_node() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder_id = Uuid::new_v4();
        let now = Utc::now();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(Folder {
                meta: Meta {
                    id: folder_id,
                    name: "Science".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent_folder_id: None,
                tags: vec![],
            })
            .await
            .unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!(folder_id.to_string(), actual[0].id);
        assert_eq!("Science", actual[0].name);
    }

    #[tokio::test]
    async fn get_element_tree_nested_folders_returns_correct_hierarchy() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let parent_id = Uuid::new_v4();
        let child_id = Uuid::new_v4();
        let now = Utc::now();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(Folder {
                meta: Meta {
                    id: parent_id,
                    name: "Science".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent_folder_id: None,
                tags: vec![],
            })
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(Folder {
                meta: Meta {
                    id: child_id,
                    name: "Biology".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent_folder_id: Some(parent_id),
                tags: vec![],
            })
            .await
            .unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!(parent_id.to_string(), actual[0].id);
        assert_eq!(1, actual[0].folders.len());
        assert_eq!(child_id.to_string(), actual[0].folders[0].id);
        assert_eq!("Biology", actual[0].folders[0].name);
    }

    #[tokio::test]
    async fn get_element_tree_folder_with_reading_extract_and_card_returns_full_chain() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder_id = Uuid::new_v4();
        let reading_id = Uuid::new_v4();
        let extract_id = Uuid::new_v4();
        let card_id = Uuid::new_v4();
        let now = Utc::now();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(Folder {
                meta: Meta {
                    id: folder_id,
                    name: "Science".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent_folder_id: None,
                tags: vec![],
            })
            .await
            .unwrap();
        scope
            .resolve::<dyn ReadingRepository>()
            .await
            .create(Reading {
                meta: Meta {
                    id: reading_id,
                    name: "Photosynthesis".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                folder_id,
                tags: vec![],
                source: ReadingSource::Website { url: String::new() },
                body: "body text".to_string(),
            })
            .await
            .unwrap();
        scope
            .resolve::<dyn ExtractRepository>()
            .await
            .create(Extract {
                meta: Meta {
                    id: extract_id,
                    name: "Key passage".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent: ExtractParent::Reading(reading_id),
                tags: vec![],
                text: "Plants convert sunlight".to_string(),
            })
            .await
            .unwrap();
        scope
            .resolve::<dyn CardRepository>()
            .await
            .create(Card {
                meta: Meta {
                    id: card_id,
                    name: "Card 1".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent: CardParent::Extract(extract_id),
                tags: vec![],
                front: "What do plants convert?".to_string(),
                back: "Sunlight".to_string(),
            })
            .await
            .unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        let folder = &actual[0];
        assert_eq!(1, folder.readings.len());
        let reading = &folder.readings[0];
        assert_eq!(reading_id.to_string(), reading.id);
        assert_eq!(1, reading.extracts.len());
        let extract = &reading.extracts[0];
        assert_eq!(extract_id.to_string(), extract.id);
        assert_eq!("Plants convert sunlight", extract.text);
        assert_eq!(1, extract.cards.len());
        assert_eq!(card_id.to_string(), extract.cards[0].id);
        assert_eq!("What do plants convert?", extract.cards[0].front);
    }

    #[tokio::test]
    async fn get_element_tree_multiple_readings_returned_sorted_by_position() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder_id = Uuid::new_v4();
        let reading_first_id = Uuid::new_v4();
        let reading_second_id = Uuid::new_v4();
        let now = Utc::now();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(Folder {
                meta: Meta {
                    id: folder_id,
                    name: "Science".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent_folder_id: None,
                tags: vec![],
            })
            .await
            .unwrap();

        // Insert in reverse position order to verify sorting
        scope
            .resolve::<dyn ReadingRepository>()
            .await
            .create(Reading {
                meta: Meta {
                    id: reading_second_id,
                    name: "Second".to_string(),
                    position: 2,
                    created_at: now,
                    modified_at: now,
                },
                folder_id,
                tags: vec![],
                source: ReadingSource::Clipboard,
                body: String::new(),
            })
            .await
            .unwrap();
        scope
            .resolve::<dyn ReadingRepository>()
            .await
            .create(Reading {
                meta: Meta {
                    id: reading_first_id,
                    name: "First".to_string(),
                    position: 1,
                    created_at: now,
                    modified_at: now,
                },
                folder_id,
                tags: vec![],
                source: ReadingSource::Clipboard,
                body: String::new(),
            })
            .await
            .unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        let readings = &actual[0].readings;
        assert_eq!(2, readings.len());
        assert_eq!(reading_first_id.to_string(), readings[0].id);
        assert_eq!(reading_second_id.to_string(), readings[1].id);
    }

    #[tokio::test]
    async fn get_element_tree_removed_folder_is_excluded() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let tx = scope.resolve::<DbTransaction>().await;
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let active_id = Uuid::new_v4();
        let removed_id = Uuid::new_v4();
        let now = Utc::now();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(Folder {
                meta: Meta {
                    id: active_id,
                    name: "Active".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent_folder_id: None,
                tags: vec![],
            })
            .await
            .unwrap();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(Folder {
                meta: Meta {
                    id: removed_id,
                    name: "Removed".to_string(),
                    position: 1,
                    created_at: now,
                    modified_at: now,
                },
                parent_folder_id: None,
                tags: vec![],
            })
            .await
            .unwrap();

        {
            let mut guard = tx.lock().await;
            let tx_ref = guard.as_mut();
            sqlx::query!("DELETE FROM folders WHERE id = $1", removed_id)
                .execute(&mut *tx_ref)
                .await
                .unwrap();
        }

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!(active_id.to_string(), actual[0].id);
    }

    #[tokio::test]
    async fn get_element_tree_extract_directly_under_folder_returns_in_folder_extracts() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder_id = Uuid::new_v4();
        let extract_id = Uuid::new_v4();
        let now = Utc::now();
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(Folder {
                meta: Meta {
                    id: folder_id,
                    name: "Science".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent_folder_id: None,
                tags: vec![],
            })
            .await
            .unwrap();
        scope
            .resolve::<dyn ExtractRepository>()
            .await
            .create(Extract {
                meta: Meta {
                    id: extract_id,
                    name: "Direct extract".to_string(),
                    position: 0,
                    created_at: now,
                    modified_at: now,
                },
                parent: ExtractParent::Folder(folder_id),
                tags: vec![],
                text: "Some text".to_string(),
            })
            .await
            .unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        let folder = &actual[0];
        assert!(folder.readings.is_empty());
        assert_eq!(1, folder.extracts.len());
        assert_eq!(extract_id.to_string(), folder.extracts[0].id);
        assert_eq!("Some text", folder.extracts[0].text);
    }
}
