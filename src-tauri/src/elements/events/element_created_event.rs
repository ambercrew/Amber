use serde::Serialize;
use uuid::Uuid;

/// Event name emitted whenever a folder, learning_asset, extract or card is
/// created.
pub const ELEMENT_CREATED_EVENT: &str = "elementCreated";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ElementCreatedEventDto {
    pub parent_id: Option<Uuid>,
}
