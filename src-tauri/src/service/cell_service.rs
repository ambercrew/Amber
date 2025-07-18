use crate::{
    dto::update_cell_request::UpdateCellRequest,
    entity::cell::{self, CellType},
    value_objects::{flash_card::FlashCard, true_false::TrueFalse},
};

use prelude::Expr;
use regex::Regex;
use sea_orm::{DbConn, entity::*, query::*};

use super::repetition_service;

pub async fn get_file_cells_ordered_by_index(
    db_conn: &DbConn,
    file_id: i32,
) -> Result<Vec<cell::Model>, String> {
    let result = cell::Entity::find()
        .filter(cell::Column::FileId.eq(file_id))
        .order_by_asc(cell::Column::Index)
        .all(db_conn)
        .await;
    match result {
        Ok(result) => Ok(result),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn create_cell(
    db_conn: &DbConn,
    file_id: i32,
    content: &str,
    cell_type: CellType,
    index: i32,
) -> Result<i32, String> {
    let txn = match db_conn.begin().await {
        Ok(txn) => txn,
        Err(err) => return Err(err.to_string()),
    };

    let cell_id = create_cell_no_transaction(&txn, file_id, content, &cell_type, index).await?;

    let result = txn.commit().await;
    match result {
        Ok(_) => Ok(cell_id),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn create_cell_no_transaction(
    db_conn: &impl ConnectionTrait,
    file_id: i32,
    content: &str,
    cell_type: &CellType,
    index: i32,
) -> Result<i32, String> {
    increase_cells_indices_starting_from(db_conn, file_id, index, 1).await?;

    let active_model = cell::ActiveModel {
        file_id: Set(file_id),
        cell_type: Set(cell_type.clone()),
        content: Set(content.to_owned()),
        searchable_content: Set(get_searchable_content(content, cell_type)),
        index: Set(index),
        ..Default::default()
    };
    let result = cell::Entity::insert(active_model).exec(db_conn).await;
    let cell_id = match result {
        Ok(insert_result) => insert_result.last_insert_id,
        Err(err) => return Err(err.to_string()),
    };

    repetition_service::update_repetitions_for_cell(db_conn, file_id, cell_id, cell_type, content)
        .await?;

    Ok(cell_id)
}

fn get_searchable_content(content: &str, cell_type: &CellType) -> String {
    let remove_html_regex = Regex::new("<[^>]*>").expect("Invalid regex");

    let searchable_content = match cell_type {
        CellType::Cloze => remove_html_regex.replace_all(content, "").to_string(),
        CellType::Note => remove_html_regex.replace_all(content, "").to_string(),
        CellType::FlashCard => {
            let flash_card: FlashCard =
                serde_json::from_str(content).expect("Cannot parse flash card JSON!");
            remove_html_regex
                .replace_all(
                    &format!("{} {}", flash_card.question, flash_card.answer),
                    "",
                )
                .to_string()
        }
        CellType::TrueFalse => {
            let true_false: TrueFalse =
                serde_json::from_str(content).expect("Cannot parse true false JSON!");
            remove_html_regex
                .replace_all(&true_false.question, "")
                .to_string()
        }
    };

    searchable_content.to_lowercase()
}

pub async fn delete_cell(db_conn: &DbConn, cell_id: i32) -> Result<(), String> {
    let cell = get_cell_by_id(db_conn, cell_id).await?;

    let result = cell::Entity::delete_many()
        .filter(cell::Column::Id.eq(cell_id))
        .exec(db_conn)
        .await;
    if let Err(err) = result {
        return Err(err.to_string());
    }

    increase_cells_indices_starting_from(db_conn, cell.file_id, cell.index, -1).await?;
    Ok(())
}

pub async fn move_cell(db_conn: &DbConn, cell_id: i32, new_index: i32) -> Result<(), String> {
    let cell = get_cell_by_id(db_conn, cell_id).await?;
    let new_index = if new_index > cell.index {
        new_index - 1
    } else {
        new_index
    };

    let txn = match db_conn.begin().await {
        Ok(txn) => txn,
        Err(err) => return Err(err.to_string()),
    };

    increase_cells_indices_starting_from(&txn, cell.file_id, cell.index + 1, -1).await?;
    increase_cells_indices_starting_from(&txn, cell.file_id, new_index, 1).await?;
    update_cell(
        &txn,
        cell::ActiveModel {
            id: Set(cell_id),
            index: Set(new_index),
            ..Default::default()
        },
    )
    .await?;

    let result = txn.commit().await;
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

async fn increase_cells_indices_starting_from(
    db_conn: &impl ConnectionTrait,
    file_id: i32,
    start_index: i32,
    increase_value: i32,
) -> Result<(), String> {
    let result = cell::Entity::update_many()
        .filter(cell::Column::FileId.eq(file_id))
        .filter(cell::Column::Index.gte(start_index))
        .col_expr(
            cell::Column::Index,
            Expr::col(cell::Column::Index).add(increase_value),
        )
        .exec(db_conn)
        .await;
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn update_cells_contents(
    db_conn: &DbConn,
    requests: Vec<UpdateCellRequest>,
) -> Result<(), String> {
    let txn = match db_conn.begin().await {
        Ok(txn) => txn,
        Err(err) => return Err(err.to_string()),
    };

    for request in requests {
        let cell = get_cell_by_id(&txn, request.cell_id).await?;
        update_cell(
            &txn,
            cell::ActiveModel {
                id: Set(request.cell_id),
                content: Set(request.content.clone()),
                searchable_content: Set(get_searchable_content(&request.content, &cell.cell_type)),
                ..Default::default()
            },
        )
        .await?;

        repetition_service::update_repetitions_for_cell(
            &txn,
            cell.file_id,
            request.cell_id,
            &cell.cell_type,
            &request.content,
        )
        .await?;
    }

    let result = txn.commit().await;
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn get_cell_by_id(
    db_conn: &impl ConnectionTrait,
    cell_id: i32,
) -> Result<cell::Model, String> {
    let result = cell::Entity::find_by_id(cell_id).one(db_conn).await;
    match result {
        Ok(cell) => Ok(cell.unwrap()),
        Err(err) => Err(err.to_string()),
    }
}

async fn update_cell(
    db_conn: &impl ConnectionTrait,
    cell: cell::ActiveModel,
) -> Result<(), String> {
    let result = cell::Entity::update(cell).exec(db_conn).await;
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn get_cells_for_files(
    db_conn: &DbConn,
    file_ids: Vec<i32>,
) -> Result<Vec<cell::Model>, String> {
    let mut cells: Vec<cell::Model> = Vec::new();
    for file_id in file_ids {
        let result = cell::Entity::find()
            .filter(cell::Column::FileId.eq(file_id))
            .all(db_conn)
            .await;
        let mut file_cells = match result {
            Ok(result) => result,
            Err(err) => return Err(err.to_string()),
        };
        cells.append(&mut file_cells);
    }
    Ok(cells)
}

#[cfg(test)]
mod tests {
    use repetition_service::get_file_repetitions;

    use crate::{
        entity::cell,
        service::{tests::create_file, tests::get_db},
    };

    use super::*;

    #[tokio::test]
    async fn create_cell_valid_input_created_cells() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "file 1").await;
        let index = 1;

        for i in 0..2 {
            cell::ActiveModel {
                index: Set(i),
                file_id: Set(file_id),
                content: Set("Already created".into()),
                searchable_content: Set("".into()),
                cell_type: Set(CellType::Note),
                ..Default::default()
            }
            .insert(&db_conn)
            .await
            .unwrap();
        }
        let content = serde_json::to_string(&FlashCard {
            question: "question".into(),
            answer: "<bold>Answer</bold>".into(),
        })
        .unwrap();

        // Act

        let actual_id = create_cell(&db_conn, file_id, &content, CellType::FlashCard, index)
            .await
            .unwrap();

        // Assert

        let actual = get_file_cells_ordered_by_index(&db_conn, file_id)
            .await
            .unwrap();
        assert_eq!(actual[1].content, content);
        assert_eq!(actual[1].id, actual_id);
        assert_eq!(actual[1].searchable_content, "question answer".to_string());
    }

    #[tokio::test]
    pub async fn delete_cell_valid_input_deleted_cell() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "file 1").await;
        let cell_id = create_cell(&db_conn, file_id, "", CellType::Note, 0)
            .await
            .unwrap();

        // Act

        delete_cell(&db_conn, cell_id).await.unwrap();

        // Assert

        let actual = get_file_cells_ordered_by_index(&db_conn, file_id)
            .await
            .unwrap();
        assert_eq!(actual.len(), 0);
    }

    #[tokio::test]
    pub async fn move_cell_move_forward_moved_cell() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "file 1").await;
        create_cell(&db_conn, file_id, "0".into(), CellType::Note, 0)
            .await
            .unwrap();
        let cell_id = create_cell(&db_conn, file_id, "1".into(), CellType::Note, 1)
            .await
            .unwrap();
        create_cell(&db_conn, file_id, "2".into(), CellType::Note, 2)
            .await
            .unwrap();
        create_cell(&db_conn, file_id, "3".into(), CellType::Note, 3)
            .await
            .unwrap();
        let new_index = 3;

        // Act

        move_cell(&db_conn, cell_id, new_index).await.unwrap();

        // Assert

        let actual = get_file_cells_ordered_by_index(&db_conn, file_id)
            .await
            .unwrap();
        assert_eq!(actual[0].content, "0".to_string());
        assert_eq!(actual[1].content, "2".to_string());
        assert_eq!(actual[2].content, "1".to_string());
        assert_eq!(actual[3].content, "3".to_string());
    }

    #[tokio::test]
    pub async fn move_cell_move_backward_moved_cell() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "file 1").await;
        create_cell(&db_conn, file_id, "0".into(), CellType::Note, 0)
            .await
            .unwrap();
        create_cell(&db_conn, file_id, "1".into(), CellType::Note, 1)
            .await
            .unwrap();
        let cell_id = create_cell(&db_conn, file_id, "2".into(), CellType::Note, 2)
            .await
            .unwrap();
        create_cell(&db_conn, file_id, "3".into(), CellType::Note, 3)
            .await
            .unwrap();
        let new_index = 1;

        // Act

        move_cell(&db_conn, cell_id, new_index).await.unwrap();

        // Assert

        let actual = get_file_cells_ordered_by_index(&db_conn, file_id)
            .await
            .unwrap();
        assert_eq!(actual[0].content, "0".to_string());
        assert_eq!(actual[1].content, "2".to_string());
        assert_eq!(actual[2].content, "1".to_string());
        assert_eq!(actual[3].content, "3".to_string());
    }

    #[tokio::test]
    pub async fn update_cells_contents_valid_input_content_updated() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "file 1").await;
        let cell1_id = create_cell(
            &db_conn,
            file_id,
            &serde_json::to_string(&FlashCard {
                question: "Old content 1".into(),
                ..Default::default()
            })
            .unwrap(),
            CellType::FlashCard,
            2,
        )
        .await
        .unwrap();

        let cell2_id = create_cell(
            &db_conn,
            file_id,
            &serde_json::to_string(&FlashCard {
                question: "Old content 2".into(),
                ..Default::default()
            })
            .unwrap(),
            CellType::FlashCard,
            2,
        )
        .await
        .unwrap();

        let requests = vec![
            UpdateCellRequest {
                cell_id: cell1_id,
                content: serde_json::to_string(&FlashCard {
                    question: "New content 1".into(),
                    ..Default::default()
                })
                .unwrap(),
            },
            UpdateCellRequest {
                cell_id: cell2_id,
                content: serde_json::to_string(&FlashCard {
                    question: "New content 2".into(),
                    ..Default::default()
                })
                .unwrap(),
            },
        ];

        // Act

        update_cells_contents(&db_conn, requests).await.unwrap();

        // Assert

        let actual_cell1 = get_cell_by_id(&db_conn, cell1_id).await.unwrap();
        let flash_card_1: FlashCard = serde_json::from_str(&actual_cell1.content).unwrap();
        assert_eq!(flash_card_1.question, "New content 1".to_string());
        assert_eq!(
            actual_cell1.searchable_content,
            "new content 1 ".to_string()
        );

        let actual_cell2 = get_cell_by_id(&db_conn, cell2_id).await.unwrap();
        let flash_card_2: FlashCard = serde_json::from_str(&actual_cell2.content).unwrap();
        assert_eq!(flash_card_2.question, "New content 2".to_string());

        let repetition_count = get_file_repetitions(&db_conn, file_id).await;
        assert_eq!(repetition_count.unwrap().len(), 2);
    }

    #[tokio::test]
    pub async fn get_cells_for_files_valid_input_returned_cells() {
        // Arrange

        let db_conn = get_db().await;
        let file1_id = create_file(&db_conn, "file 1").await;

        for i in 0..2 {
            create_cell(&db_conn, file1_id, "".into(), CellType::Note, i)
                .await
                .unwrap();
        }

        let file2_id = create_file(&db_conn, "file 2").await;
        for i in 0..3 {
            create_cell(&db_conn, file2_id, "".into(), CellType::Note, i)
                .await
                .unwrap();
        }

        // Act

        let actual = get_cells_for_files(&db_conn, vec![file1_id, file2_id])
            .await
            .unwrap();

        // Assert

        assert_eq!(5, actual.len());
    }
}
