use serde::Serialize;

use crate::elements::value_objects::element_id::ElementId;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MetaNodeDto {
    pub id: ElementId,
    pub name: String,
    pub position: String,
    pub tags: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeChildrenDto {
    pub folders: Vec<NodeDto>,
    pub readings: Vec<NodeDto>,
    pub extracts: Vec<NodeDto>,
    pub cards: Vec<NodeDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NodeDto {
    pub meta: MetaNodeDto,
    pub children: NodeChildrenDto,
}
