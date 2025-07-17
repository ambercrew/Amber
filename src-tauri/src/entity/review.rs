use sea_orm::entity::prelude::*;
use sea_orm::entity::*;
use sea_orm::sqlx::types::chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(
    Debug, Default, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize,
)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum Rating {
    #[default]
    #[sea_orm(string_value = "Again")]
    Again,
    #[sea_orm(string_value = "Hard")]
    Hard,
    #[sea_orm(string_value = "Good")]
    Good,
    #[sea_orm(string_value = "Easy")]
    Easy,
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[sea_orm(table_name = "review")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub cell_id: Option<i32>,
    pub study_time: i32,
    pub date: DateTimeUtc,
    pub rating: Rating,
}

#[derive(Copy, Clone, Debug, EnumIter)]
pub enum Relation {
    Cell,
}

impl RelationTrait for Relation {
    fn def(&self) -> RelationDef {
        match self {
            Self::Cell => Entity::belongs_to(super::cell::Entity)
                .from(Column::CellId)
                .to(super::cell::Column::Id)
                .on_delete(ForeignKeyAction::SetNull)
                .into(),
        }
    }
}

impl Related<super::cell::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Cell.def()
    }
}

impl ActiveModelBehavior for ActiveModel {
    fn new() -> Self {
        Self {
            date: Set(Utc::now().to_utc()),
            ..ActiveModelTrait::default()
        }
    }
}
