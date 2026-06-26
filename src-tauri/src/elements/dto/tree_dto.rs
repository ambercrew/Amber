use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardNodeDto {
    pub id: String,
    pub name: String,
    pub position: u32,
    pub front: String,
    pub back: String,
    pub tags: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractNodeDto {
    pub id: String,
    pub name: String,
    pub position: u32,
    pub text: String,
    pub tags: Vec<String>,
    pub extracts: Vec<ExtractNodeDto>,
    pub cards: Vec<CardNodeDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingNodeDto {
    pub id: String,
    pub name: String,
    pub position: u32,
    pub tags: Vec<String>,
    pub extracts: Vec<ExtractNodeDto>,
    pub cards: Vec<CardNodeDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderNodeDto {
    pub id: String,
    pub name: String,
    pub position: u32,
    pub tags: Vec<String>,
    pub folders: Vec<FolderNodeDto>,
    pub readings: Vec<ReadingNodeDto>,
    pub extracts: Vec<ExtractNodeDto>,
    pub cards: Vec<CardNodeDto>,
}
