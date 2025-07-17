use crate::{
    dto::search_result::SearchResult,
    entity::{cell, repetition},
};

use sea_orm::{DbConn, entity::*, query::*};

pub async fn search_cells(db_conn: &DbConn, search_text: &str) -> Result<SearchResult, String> {
    let result = cell::Entity::find()
        .find_with_related(repetition::Entity)
        .filter(cell::Column::SearchableContent.contains(search_text.to_lowercase()))
        .limit(150)
        .all(db_conn)
        .await;

    let rows = match result {
        Ok(rows) => rows,
        Err(err) => return Err(err.to_string()),
    };

    let mut cells: Vec<cell::Model> = vec![];
    let mut repetitions: Vec<repetition::Model> = vec![];

    for (cell, mut repetition) in rows {
        cells.push(cell);
        repetitions.append(&mut repetition);
    }

    Ok(SearchResult { cells, repetitions })
}

#[cfg(test)]
mod tests {
    use crate::{
        entity::{cell::CellType, review::Rating},
        model::flash_card::FlashCard,
        service::{
            cell_service::create_cell,
            review_service::register_review,
            tests::{create_file, get_db},
        },
    };

    use super::*;

    #[tokio::test]
    pub async fn search_cells_valid_input_returned_relevant_cells_with_repetitions() {
        // Arrange

        let db_conn = get_db().await;
        let file1_id = create_file(&db_conn, "file 1").await;

        for i in 0..2 {
            create_cell(&db_conn, file1_id, "include".into(), CellType::Note, i)
                .await
                .unwrap();
        }

        let file2_id = create_file(&db_conn, "file 2").await;
        create_cell(
            &db_conn,
            file2_id,
            &serde_json::to_string(&FlashCard {
                question: "include".into(),
                answer: "".into(),
            })
            .unwrap(),
            CellType::FlashCard,
            0,
        )
        .await
        .unwrap();

        let repetition =
            crate::service::repetition_service::get_file_repetitions(&db_conn, file2_id)
                .await
                .unwrap();
        register_review(
            &db_conn,
            repetition::Model {
                id: repetition[0].id,
                file_id: repetition[0].file_id,
                cell_id: repetition[0].cell_id,
                state: repetition::State::Review,
                ..Default::default()
            },
            Rating::Again,
            10,
        )
        .await
        .unwrap();

        create_cell(&db_conn, file2_id, "exclude".into(), CellType::Note, 1)
            .await
            .unwrap();

        // Act

        let actual = search_cells(&db_conn, "include".into()).await.unwrap();

        // Assert

        assert_eq!(3, actual.cells.len());
        assert_eq!(1, actual.repetitions.len());
        assert_eq!(repetition::State::Review, actual.repetitions[0].state);
    }
}
