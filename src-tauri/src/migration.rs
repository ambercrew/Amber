use sea_orm::{
    ConnectionTrait, DatabaseConnection, DbBackend, DbErr, Schema, query::*, sea_query::Index,
};

use crate::entity::{cell, file, repetition, review};

pub async fn setup_schema(db_conn: &DatabaseConnection) -> Result<(), DbErr> {
    let schema = Schema::new(DbBackend::Sqlite);
    let backend = db_conn.get_database_backend();

    let txn = db_conn.begin().await?;

    let stmt = schema
        .create_table_from_entity(file::Entity)
        .if_not_exists()
        .to_owned();
    txn.execute(backend.build(&stmt)).await?;

    let stmt = schema
        .create_table_from_entity(cell::Entity)
        .if_not_exists()
        .to_owned();
    txn.execute(backend.build(&stmt)).await?;

    let stmt = schema
        .create_table_from_entity(repetition::Entity)
        .if_not_exists()
        .to_owned();
    txn.execute(backend.build(&stmt)).await?;

    let stmt = schema
        .create_table_from_entity(review::Entity)
        .if_not_exists()
        .to_owned();
    txn.execute(backend.build(&stmt)).await?;

    let index = Index::create()
        .name("idx-path")
        .table(file::Entity)
        .col(file::Column::Path)
        .col(file::Column::IsFolder)
        .unique()
        .if_not_exists()
        .to_owned();
    txn.execute(backend.build(&index)).await?;

    txn.commit().await
}
