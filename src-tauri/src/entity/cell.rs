use sea_orm::entity::prelude::*;
use sea_orm::sea_query::ForeignKeyAction;
use serde::{Deserialize, Serialize};

#[derive(
    Debug, Default, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize,
)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum CellType {
    #[default]
    #[sea_orm(string_value = "FlashCard")]
    FlashCard,
    #[sea_orm(string_value = "Note")]
    Note,
    #[sea_orm(string_value = "Cloze")]
    Cloze,
    #[sea_orm(string_value = "TrueFalse")]
    TrueFalse,
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[sea_orm(table_name = "cell")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub file_id: i32,
    pub index: i32,
    pub content: String,
    pub searchable_content: String,
    pub cell_type: CellType,
}

#[derive(Copy, Clone, Debug, EnumIter)]
pub enum Relation {
    File,
    Repetition,
    Review,
}

impl RelationTrait for Relation {
    fn def(&self) -> RelationDef {
        match self {
            Self::File => Entity::belongs_to(super::file::Entity)
                .from(Column::FileId)
                .to(super::file::Column::Id)
                .on_delete(ForeignKeyAction::Cascade)
                .into(),
            Self::Repetition => Entity::has_many(super::repetition::Entity).into(),
            Self::Review => Entity::has_many(super::review::Entity).into(),
        }
    }
}

impl Related<super::file::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::File.def()
    }
}

impl Related<super::repetition::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Repetition.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
