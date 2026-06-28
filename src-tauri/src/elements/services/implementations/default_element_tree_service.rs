use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use injector_derive::ScopeInjectable;

use crate::common::repository_error::RepositoryError;
use crate::elements::dto::tree_dto::{MetaNodeDto, NodeChildrenDto, NodeDto};
use crate::elements::entities::traits::Element;
use crate::elements::entities::{card::Card, extract::Extract, folder::Folder, reading::Reading};
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::services::element_tree_service::ElementTreeService;
use crate::elements::value_objects::element_id::ElementId;

#[derive(ScopeInjectable)]
pub struct DefaultElementTreeService {
    folder_repository: Arc<dyn FolderRepository>,
    reading_repository: Arc<dyn ReadingRepository>,
    extract_repository: Arc<dyn ExtractRepository>,
    card_repository: Arc<dyn CardRepository>,
}

type ElementMap<V> = HashMap<Option<ElementId>, Vec<V>>;

#[async_trait]
impl ElementTreeService for DefaultElementTreeService {
    async fn get_element_tree(&self) -> Result<Vec<NodeDto>, RepositoryError> {
        let folders = self.folder_repository.get_all().await?;
        let readings = self.reading_repository.get_all().await?;
        let extracts = self.extract_repository.get_all().await?;
        let cards = self.card_repository.get_all().await?;

        let folders_by_parent = group_by_parent(folders, |f| f.meta().parent);
        let readings_by_parent = group_by_parent(readings, |r| r.meta().parent);
        let extracts_by_parent = group_by_parent(extracts, |e| e.meta().parent);
        let cards_by_parent = group_by_parent(cards, |c| c.meta().parent);

        let empty: Vec<Folder> = vec![];
        Ok(folders_by_parent
            .get(&None)
            .unwrap_or(&empty)
            .iter()
            .map(|f| {
                build_node(
                    f,
                    Some(ElementId::Folder(f.meta().id)),
                    &folders_by_parent,
                    &readings_by_parent,
                    &extracts_by_parent,
                    &cards_by_parent,
                )
            })
            .collect())
    }
}

fn group_by_parent<V, F>(items: Vec<V>, get_parent: F) -> ElementMap<V>
where
    V: Element,
    F: Fn(&V) -> Option<ElementId>,
{
    let mut map: ElementMap<V> = HashMap::new();
    for item in items {
        map.entry(get_parent(&item)).or_default().push(item);
    }
    for group in map.values_mut() {
        group.sort_by(|a, b| a.meta().position.cmp(&b.meta().position));
    }
    map
}

fn make_meta(element: &impl Element) -> MetaNodeDto {
    let meta = element.meta();
    MetaNodeDto {
        id: meta.id.to_string(),
        name: meta.name.clone(),
        position: meta.position.to_string(),
        tags: meta.tags.iter().map(|t| t.to_string()).collect(),
    }
}

fn build_node(
    element: &impl Element,
    parent_key: Option<ElementId>,
    folders_by_parent: &ElementMap<Folder>,
    readings_by_parent: &ElementMap<Reading>,
    extracts_by_parent: &ElementMap<Extract>,
    cards_by_parent: &ElementMap<Card>,
) -> NodeDto {
    NodeDto {
        meta: make_meta(element),
        children: NodeChildrenDto {
            folders: folders_by_parent
                .get(&parent_key)
                .map(|fs| {
                    fs.iter()
                        .map(|f| {
                            build_node(
                                f,
                                Some(ElementId::Folder(f.meta().id)),
                                folders_by_parent,
                                readings_by_parent,
                                extracts_by_parent,
                                cards_by_parent,
                            )
                        })
                        .collect()
                })
                .unwrap_or_default(),
            readings: readings_by_parent
                .get(&parent_key)
                .map(|rs| {
                    rs.iter()
                        .map(|r| {
                            build_node(
                                r,
                                Some(ElementId::Reading(r.meta().id)),
                                folders_by_parent,
                                readings_by_parent,
                                extracts_by_parent,
                                cards_by_parent,
                            )
                        })
                        .collect()
                })
                .unwrap_or_default(),
            extracts: extracts_by_parent
                .get(&parent_key)
                .map(|es| {
                    es.iter()
                        .map(|e| {
                            build_node(
                                e,
                                Some(ElementId::Extract(e.meta().id)),
                                folders_by_parent,
                                readings_by_parent,
                                extracts_by_parent,
                                cards_by_parent,
                            )
                        })
                        .collect()
                })
                .unwrap_or_default(),
            cards: cards_by_parent
                .get(&parent_key)
                .map(|cs| {
                    cs.iter()
                        .map(|c| {
                            build_node(
                                c,
                                Some(ElementId::Card(c.meta().id)),
                                folders_by_parent,
                                readings_by_parent,
                                extracts_by_parent,
                                cards_by_parent,
                            )
                        })
                        .collect()
                })
                .unwrap_or_default(),
        },
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use fractional_index::FractionalIndex;
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
            value_objects::{element_id::ElementId, meta::Meta},
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

    fn make_meta() -> Meta {
        Meta {
            id: Uuid::new_v4(),
            name: "test".into(),
            parent: None,
            position: FractionalIndex::default(),
            tags: vec![],
            created_at: Utc::now(),
            modified_at: Utc::now(),
        }
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

        let folder = Folder {
            meta: Meta {
                name: "Science".to_string(),
                ..make_meta()
            },
        };
        let folder_id = folder.meta.id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!(folder_id.to_string(), actual[0].meta.id);
        assert_eq!("Science", actual[0].meta.name);
    }

    #[tokio::test]
    async fn get_element_tree_nested_folders_returns_correct_hierarchy() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let parent = Folder {
            meta: Meta {
                name: "Science".to_string(),
                ..make_meta()
            },
        };
        let parent_id = parent.meta.id;
        let child = Folder {
            meta: Meta {
                name: "Biology".to_string(),
                parent: Some(ElementId::Folder(parent_id)),
                ..make_meta()
            },
        };
        let child_id = child.meta.id;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        folder_repo.create(parent).await.unwrap();
        folder_repo.create(child).await.unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        assert_eq!(parent_id.to_string(), actual[0].meta.id);
        assert_eq!(1, actual[0].children.folders.len());
        assert_eq!(child_id.to_string(), actual[0].children.folders[0].meta.id);
        assert_eq!("Biology", actual[0].children.folders[0].meta.name);
    }

    #[tokio::test]
    async fn get_element_tree_folder_with_reading_extract_and_card_returns_full_chain() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder = Folder {
            meta: Meta {
                name: "Science".to_string(),
                ..make_meta()
            },
        };
        let folder_id = folder.meta.id;
        let reading = Reading {
            meta: Meta {
                name: "Photosynthesis".to_string(),
                parent: Some(ElementId::Folder(folder_id)),
                ..make_meta()
            },
            source: ReadingSource::Website { url: String::new() },
            body: "body text".to_string(),
        };
        let reading_id = reading.meta.id;
        let extract = Extract {
            meta: Meta {
                name: "Key passage".to_string(),
                parent: Some(ElementId::Reading(reading_id)),
                ..make_meta()
            },
            text: "Plants convert sunlight".to_string(),
        };
        let extract_id = extract.meta.id;
        let card = Card {
            meta: Meta {
                name: "Card 1".to_string(),
                parent: Some(ElementId::Extract(extract_id)),
                ..make_meta()
            },
            front: "What do plants convert?".to_string(),
            back: "Sunlight".to_string(),
        };
        let card_id = card.meta.id;

        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        scope
            .resolve::<dyn ReadingRepository>()
            .await
            .create(reading)
            .await
            .unwrap();
        scope
            .resolve::<dyn ExtractRepository>()
            .await
            .create(extract)
            .await
            .unwrap();
        scope
            .resolve::<dyn CardRepository>()
            .await
            .create(card)
            .await
            .unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        assert_eq!(1, actual.len());
        let folder = &actual[0];
        assert_eq!(1, folder.children.readings.len());
        let reading = &folder.children.readings[0];
        assert_eq!(reading_id.to_string(), reading.meta.id);
        assert_eq!(1, reading.children.extracts.len());
        let extract = &reading.children.extracts[0];
        assert_eq!(extract_id.to_string(), extract.meta.id);
        assert_eq!(1, extract.children.cards.len());
        assert_eq!(card_id.to_string(), extract.children.cards[0].meta.id);
    }

    #[tokio::test]
    async fn get_element_tree_multiple_readings_returned_sorted_by_position() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder = Folder {
            meta: Meta {
                name: "Science".to_string(),
                ..make_meta()
            },
        };
        let folder_id = folder.meta.id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();

        let reading_first = Reading {
            meta: Meta {
                name: "First".to_string(),
                parent: Some(ElementId::Folder(folder_id)),
                position: FractionalIndex::new_after(&FractionalIndex::default()),
                ..make_meta()
            },
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let reading_second = Reading {
            meta: Meta {
                name: "Second".to_string(),
                parent: Some(ElementId::Folder(folder_id)),
                position: FractionalIndex::new_after(&FractionalIndex::new_after(
                    &FractionalIndex::default(),
                )),
                ..make_meta()
            },
            source: ReadingSource::Clipboard,
            body: String::new(),
        };
        let reading_first_id = reading_first.meta.id;
        let reading_second_id = reading_second.meta.id;

        // Insert in reverse position order to verify sorting
        let reading_repo = scope.resolve::<dyn ReadingRepository>().await;
        reading_repo.create(reading_second).await.unwrap();
        reading_repo.create(reading_first).await.unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        let readings = &actual[0].children.readings;
        assert_eq!(2, readings.len());
        assert_eq!(reading_first_id.to_string(), readings[0].meta.id);
        assert_eq!(reading_second_id.to_string(), readings[1].meta.id);
    }

    #[tokio::test]
    async fn get_element_tree_removed_folder_is_excluded() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let tx = scope.resolve::<DbTransaction>().await;
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let active = Folder {
            meta: Meta {
                name: "Active".to_string(),
                ..make_meta()
            },
        };
        let removed = Folder {
            meta: Meta {
                name: "Removed".to_string(),
                position: FractionalIndex::new_after(&FractionalIndex::default()),
                ..make_meta()
            },
        };
        let active_id = active.meta.id;
        let removed_id = removed.meta.id;
        let folder_repo = scope.resolve::<dyn FolderRepository>().await;
        folder_repo.create(active).await.unwrap();
        folder_repo.create(removed).await.unwrap();

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
        assert_eq!(active_id.to_string(), actual[0].meta.id);
    }

    #[tokio::test]
    async fn get_element_tree_extract_directly_under_folder_returns_in_folder_extracts() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder = Folder {
            meta: Meta {
                name: "Science".to_string(),
                ..make_meta()
            },
        };
        let folder_id = folder.meta.id;
        let extract = Extract {
            meta: Meta {
                name: "Direct extract".to_string(),
                parent: Some(ElementId::Folder(folder_id)),
                ..make_meta()
            },
            text: "Some text".to_string(),
        };
        let extract_id = extract.meta.id;
        scope
            .resolve::<dyn FolderRepository>()
            .await
            .create(folder)
            .await
            .unwrap();
        scope
            .resolve::<dyn ExtractRepository>()
            .await
            .create(extract)
            .await
            .unwrap();

        // Act

        let actual = service.get_element_tree().await.unwrap();

        // Assert

        let folder = &actual[0];
        assert!(folder.children.readings.is_empty());
        assert_eq!(1, folder.children.extracts.len());
        assert_eq!(extract_id.to_string(), folder.children.extracts[0].meta.id);
    }
}
