use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::elements::dto::tag_dto::TagResponseDto;
use crate::elements::entities::card::Card;
use crate::elements::entities::extract::Extract;
use crate::elements::entities::folder::Folder;
use crate::elements::entities::reading::Reading;
use crate::elements::value_objects::element_id::ElementId;
use crate::elements::value_objects::meta::Meta;
use crate::elements::value_objects::read_point::ReadPoint;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetaResponseDto {
    pub element_id: ElementId,
    pub name: String,
    pub parent: Option<ElementId>,
    pub position: String,
    pub tags: Vec<TagResponseDto>,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub source_id: Option<Uuid>,
    pub derived_from: Option<ElementId>,
}

impl From<Meta> for MetaResponseDto {
    fn from(meta: Meta) -> Self {
        MetaResponseDto {
            element_id: meta.element_id,
            name: meta.name,
            parent: meta.parent,
            position: meta.position.to_string(),
            tags: Vec::new(),
            created_at: meta.created_at,
            modified_at: meta.modified_at,
            source_id: meta.source_id,
            derived_from: meta.derived_from,
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
    /// Where the user last read up to. The split index and per-split content are
    /// fetched separately (lazily) rather than inlined here.
    pub read_point: ReadPoint,
    pub a_factor: f32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractResponseDto {
    pub meta: MetaResponseDto,
    pub content: String,
    pub a_factor: f32,
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

impl AnyElementDto {
    pub fn meta_mut(&mut self) -> &mut MetaResponseDto {
        match self {
            AnyElementDto::Folder(d) => &mut d.meta,
            AnyElementDto::Reading(d) => &mut d.meta,
            AnyElementDto::Extract(d) => &mut d.meta,
            AnyElementDto::Card(d) => &mut d.meta,
        }
    }
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
        // Split content is loaded lazily via the split index / split content
        // commands, so only the reading's position and metadata are returned here.
        AnyElementDto::Reading(ReadingResponseDto {
            meta: reading.meta.into(),
            read_point: reading.read_point,
            a_factor: reading.a_factor,
        })
    }
}

impl From<Extract> for AnyElementDto {
    fn from(extract: Extract) -> Self {
        AnyElementDto::Extract(ExtractResponseDto {
            meta: extract.meta.into(),
            content: extract.content,
            a_factor: extract.a_factor,
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
