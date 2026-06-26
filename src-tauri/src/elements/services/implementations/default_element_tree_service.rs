use std::collections::HashMap;
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
use crate::elements::repositories::card_repository::CardRepository;
use crate::elements::repositories::extract_repository::ExtractRepository;
use crate::elements::repositories::folder_repository::FolderRepository;
use crate::elements::repositories::reading_repository::ReadingRepository;
use crate::elements::services::element_tree_service::ElementTreeService;
use crate::elements::value_objects::provenance::Provenance;

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

        let mut folders_by_parent: HashMap<Option<Uuid>, Vec<Folder>> = HashMap::new();
        for folder in folders {
            folders_by_parent
                .entry(folder.parent_folder_id)
                .or_default()
                .push(folder);
        }
        for children in folders_by_parent.values_mut() {
            children.sort_by_key(|f| f.meta.position);
        }

        let mut readings_by_folder: HashMap<Uuid, Vec<Reading>> = HashMap::new();
        for reading in readings {
            readings_by_folder
                .entry(reading.folder_id)
                .or_default()
                .push(reading);
        }
        for rs in readings_by_folder.values_mut() {
            rs.sort_by_key(|r| r.meta.position);
        }

        let mut extracts_by_parent: HashMap<(String, Uuid), Vec<Extract>> = HashMap::new();
        for extract in extracts {
            extracts_by_parent
                .entry(provenance_key(extract.parent))
                .or_default()
                .push(extract);
        }
        for es in extracts_by_parent.values_mut() {
            es.sort_by_key(|e| e.meta.position);
        }

        let mut cards_by_parent: HashMap<(String, Uuid), Vec<Card>> = HashMap::new();
        for card in cards {
            cards_by_parent
                .entry(provenance_key(card.parent))
                .or_default()
                .push(card);
        }
        for cs in cards_by_parent.values_mut() {
            cs.sort_by_key(|c| c.meta.position);
        }

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

fn provenance_key(provenance: Provenance) -> (String, Uuid) {
    match provenance {
        Provenance::Reading(id) => ("reading".to_string(), id),
        Provenance::Extract(id) => ("extract".to_string(), id),
        Provenance::Folder(id) => ("folder".to_string(), id),
    }
}

fn build_folder_node(
    folder: &Folder,
    folders_by_parent: &HashMap<Option<Uuid>, Vec<Folder>>,
    readings_by_folder: &HashMap<Uuid, Vec<Reading>>,
    extracts_by_parent: &HashMap<(String, Uuid), Vec<Extract>>,
    cards_by_parent: &HashMap<(String, Uuid), Vec<Card>>,
) -> FolderNodeDto {
    let id = folder.meta.id;
    let folder_key = ("folder".to_string(), id);

    let child_folders = folders_by_parent
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
        .unwrap_or_default();

    let readings = readings_by_folder
        .get(&id)
        .map(|rs| {
            rs.iter()
                .map(|r| build_reading_node(r, extracts_by_parent, cards_by_parent))
                .collect()
        })
        .unwrap_or_default();

    let extracts = extracts_by_parent
        .get(&folder_key)
        .map(|es| {
            es.iter()
                .map(|e| build_extract_node(e, extracts_by_parent, cards_by_parent))
                .collect()
        })
        .unwrap_or_default();

    let cards = cards_by_parent
        .get(&folder_key)
        .map(|cs| cs.iter().map(to_card_node).collect())
        .unwrap_or_default();

    FolderNodeDto {
        id: id.to_string(),
        name: folder.meta.name.clone(),
        position: folder.meta.position,
        tags: folder.tags.iter().map(|t| t.to_string()).collect(),
        folders: child_folders,
        readings,
        extracts,
        cards,
    }
}

fn build_reading_node(
    reading: &Reading,
    extracts_by_parent: &HashMap<(String, Uuid), Vec<Extract>>,
    cards_by_parent: &HashMap<(String, Uuid), Vec<Card>>,
) -> ReadingNodeDto {
    let id = reading.meta.id;
    let reading_key = ("reading".to_string(), id);

    let extracts = extracts_by_parent
        .get(&reading_key)
        .map(|es| {
            es.iter()
                .map(|e| build_extract_node(e, extracts_by_parent, cards_by_parent))
                .collect()
        })
        .unwrap_or_default();

    let cards = cards_by_parent
        .get(&reading_key)
        .map(|cs| cs.iter().map(to_card_node).collect())
        .unwrap_or_default();

    ReadingNodeDto {
        id: id.to_string(),
        name: reading.meta.name.clone(),
        position: reading.meta.position,
        tags: reading.tags.iter().map(|t| t.to_string()).collect(),
        extracts,
        cards,
    }
}

fn build_extract_node(
    extract: &Extract,
    extracts_by_parent: &HashMap<(String, Uuid), Vec<Extract>>,
    cards_by_parent: &HashMap<(String, Uuid), Vec<Card>>,
) -> ExtractNodeDto {
    let id = extract.meta.id;
    let extract_key = ("extract".to_string(), id);

    let child_extracts = extracts_by_parent
        .get(&extract_key)
        .map(|es| {
            es.iter()
                .map(|e| build_extract_node(e, extracts_by_parent, cards_by_parent))
                .collect()
        })
        .unwrap_or_default();

    let cards = cards_by_parent
        .get(&extract_key)
        .map(|cs| cs.iter().map(to_card_node).collect())
        .unwrap_or_default();

    ExtractNodeDto {
        id: id.to_string(),
        name: extract.meta.name.clone(),
        position: extract.meta.position,
        text: extract.text.clone(),
        tags: extract.tags.iter().map(|t| t.to_string()).collect(),
        extracts: child_extracts,
        cards,
    }
}

fn to_card_node(card: &Card) -> CardNodeDto {
    CardNodeDto {
        id: card.meta.id.to_string(),
        name: card.meta.name.clone(),
        position: card.meta.position,
        front: card.front.clone(),
        back: card.back.clone(),
        tags: card.tags.iter().map(|t| t.to_string()).collect(),
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use injector::{injector::Injector, register_scope};
    use std::sync::Arc;
    use uuid::Uuid;

    use crate::{
        elements::{
            repositories::{
                card_repository::CardRepository, extract_repository::ExtractRepository,
                folder_repository::FolderRepository, reading_repository::ReadingRepository,
            },
            services::element_tree_service::ElementTreeService,
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

    // TODO: move these methods
    async fn insert_folder(
        tx: &Arc<DbTransaction>,
        id: Uuid,
        name: &str,
        position: i64,
        parent_folder_id: Option<Uuid>,
    ) {
        let now = Utc::now();
        let mut guard = tx.lock().await;
        let tx_ref = guard.as_mut();
        sqlx::query!(
            "INSERT INTO folders (id, name, position, parent_folder_id, created_at, modified_at)
             VALUES ($1, $2, $3, $4, datetime($5), datetime($6))",
            id,
            name,
            position,
            parent_folder_id,
            now,
            now
        )
        .execute(&mut *tx_ref)
        .await
        .unwrap();
    }

    async fn insert_reading(
        tx: &Arc<DbTransaction>,
        id: Uuid,
        name: &str,
        position: i64,
        folder_id: Uuid,
        source_type: &str,
        body: &str,
    ) {
        let now = Utc::now();
        let mut guard = tx.lock().await;
        let tx_ref = guard.as_mut();
        sqlx::query!(
            "INSERT INTO readings (id, name, position, folder_id, created_at, modified_at, source_type, body)
             VALUES ($1, $2, $3, $4, datetime($5), datetime($6), $7, $8)",
            id,
            name,
            position,
            folder_id,
            now,
            now,
            source_type,
            body
        )
        .execute(&mut *tx_ref)
        .await
        .unwrap();
    }

    async fn insert_extract(
        tx: &Arc<DbTransaction>,
        id: Uuid,
        name: &str,
        position: i64,
        parent_type: &str,
        parent_id: Uuid,
        text: &str,
    ) {
        let now = Utc::now();
        let mut guard = tx.lock().await;
        let tx_ref = guard.as_mut();
        sqlx::query!(
            "INSERT INTO extracts (id, name, position, parent_type, parent_id, created_at, modified_at, text)
             VALUES ($1, $2, $3, $4, $5, datetime($6), datetime($7), $8)",
            id,
            name,
            position,
            parent_type,
            parent_id,
            now,
            now,
            text
        )
        .execute(&mut *tx_ref)
        .await
        .unwrap();
    }

    async fn insert_card(
        tx: &Arc<DbTransaction>,
        id: Uuid,
        name: &str,
        position: i64,
        parent_type: &str,
        parent_id: Uuid,
        front: &str,
        back: &str,
    ) {
        let now = Utc::now();
        let mut guard = tx.lock().await;
        let tx_ref = guard.as_mut();
        sqlx::query!(
            "INSERT INTO cards (id, name, position, parent_type, parent_id, created_at, modified_at, front, back)
             VALUES ($1, $2, $3, $4, $5, datetime($6), datetime($7), $8, $9)",
            id,
            name,
            position,
            parent_type,
            parent_id,
            now,
            now,
            front,
            back
        )
        .execute(&mut *tx_ref)
        .await
        .unwrap();
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
        let tx = scope.resolve::<DbTransaction>().await;
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder_id = Uuid::new_v4();
        insert_folder(&tx, folder_id, "Science", 0, None).await;

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
        let tx = scope.resolve::<DbTransaction>().await;
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let parent_id = Uuid::new_v4();
        let child_id = Uuid::new_v4();
        insert_folder(&tx, parent_id, "Science", 0, None).await;
        insert_folder(&tx, child_id, "Biology", 0, Some(parent_id)).await;

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
        let tx = scope.resolve::<DbTransaction>().await;
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder_id = Uuid::new_v4();
        let reading_id = Uuid::new_v4();
        let extract_id = Uuid::new_v4();
        let card_id = Uuid::new_v4();

        insert_folder(&tx, folder_id, "Science", 0, None).await;
        insert_reading(
            &tx,
            reading_id,
            "Photosynthesis",
            0,
            folder_id,
            "article",
            "body text",
        )
        .await;
        insert_extract(
            &tx,
            extract_id,
            "Key passage",
            0,
            "reading",
            reading_id,
            "Plants convert sunlight",
        )
        .await;
        insert_card(
            &tx,
            card_id,
            "Card 1",
            0,
            "extract",
            extract_id,
            "What do plants convert?",
            "Sunlight",
        )
        .await;

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
        let tx = scope.resolve::<DbTransaction>().await;
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder_id = Uuid::new_v4();
        let reading_first_id = Uuid::new_v4();
        let reading_second_id = Uuid::new_v4();

        insert_folder(&tx, folder_id, "Science", 0, None).await;
        // Insert in reverse position order to verify sorting
        insert_reading(
            &tx,
            reading_second_id,
            "Second",
            2,
            folder_id,
            "clipboard",
            "",
        )
        .await;
        insert_reading(
            &tx,
            reading_first_id,
            "First",
            1,
            folder_id,
            "clipboard",
            "",
        )
        .await;

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

        insert_folder(&tx, active_id, "Active", 0, None).await;
        insert_folder(&tx, removed_id, "Removed", 1, None).await;

        let now = Utc::now();
        {
            let mut guard = tx.lock().await;
            let tx_ref = guard.as_mut();
            sqlx::query!(
                "UPDATE folders SET removed_at = datetime($1) WHERE id = $2",
                now,
                removed_id
            )
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
        let tx = scope.resolve::<DbTransaction>().await;
        let service = scope.resolve::<dyn ElementTreeService>().await;

        let folder_id = Uuid::new_v4();
        let extract_id = Uuid::new_v4();

        insert_folder(&tx, folder_id, "Science", 0, None).await;
        insert_extract(
            &tx,
            extract_id,
            "Direct extract",
            0,
            "folder",
            folder_id,
            "Some text",
        )
        .await;

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
