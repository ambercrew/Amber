use chrono::{DateTime, Utc};
use serde::Serialize;

use crate::elements::entities::card::Card;
use crate::elements::entities::extract::Extract;
use crate::elements::entities::folder::Folder;
use crate::elements::entities::reading::{Reading, ReadingSource};
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetaResponseDto {
    pub id: ElementId,
    pub name: String,
    pub parent: Option<ElementId>,
    pub position: String,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
}

impl From<Meta> for MetaResponseDto {
    fn from(meta: Meta) -> Self {
        MetaResponseDto {
            id: meta.id,
            name: meta.name,
            parent: meta.parent,
            position: meta.position.to_string(),
            tags: meta.tags.iter().map(|t| t.to_string()).collect(),
            created_at: meta.created_at,
            modified_at: meta.modified_at,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderResponseDto {
    pub meta: MetaResponseDto,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingResponseDto {
    pub meta: MetaResponseDto,
    pub source: ReadingSource,
    pub body: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractResponseDto {
    pub meta: MetaResponseDto,
    pub text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardResponseDto {
    pub meta: MetaResponseDto,
    pub front: String,
    pub back: String,
}

#[derive(Serialize)]
#[serde(tag = "type", content = "data", rename_all = "camelCase")]
pub enum AnyElementDto {
    Folder(FolderResponseDto),
    Reading(ReadingResponseDto),
    Extract(ExtractResponseDto),
    Card(CardResponseDto),
}

impl From<Folder> for AnyElementDto {
    fn from(folder: Folder) -> Self {
        AnyElementDto::Folder(FolderResponseDto {
            meta: folder.meta.into(),
        })
    }
}

impl From<Reading> for AnyElementDto {
    fn from(reading: Reading) -> Self {
        AnyElementDto::Reading(ReadingResponseDto {
            meta: reading.meta.into(),
            source: reading.source,
            body: reading.body,
        })
    }
}

impl From<Extract> for AnyElementDto {
    fn from(extract: Extract) -> Self {
        AnyElementDto::Extract(ExtractResponseDto {
            meta: extract.meta.into(),
            text: extract.text,
        })
    }
}

impl From<Card> for AnyElementDto {
    fn from(card: Card) -> Self {
        AnyElementDto::Card(CardResponseDto {
            meta: card.meta.into(),
            front: card.front,
            back: card.back,
        })
    }
}
