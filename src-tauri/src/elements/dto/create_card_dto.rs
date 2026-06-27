use serde::Deserialize;

use crate::elements::value_objects::card_parent::CardParent;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCardDto {
    pub name: String,
    pub position: i64,
    pub parent: CardParent,
    pub front: String,
    pub back: String,
}
