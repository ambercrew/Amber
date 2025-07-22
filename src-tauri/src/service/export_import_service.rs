use std::fs::{self, File};

use sea_orm::{DbConn, query::*};

use super::{cell_service, file_service};
use crate::value_objects::exported_item::{ExportedCell, ExportedItem, ExportedItemType};
use lol_html::html_content::Element;
use lol_html::{RewriteStrSettings, element, rewrite_str};

pub async fn export(db_conn: &DbConn, item_id: i32, export_path: String) -> Result<(), String> {
    let item = file_service::get_by_id(db_conn, item_id).await?;
    let slash_index = item.path.rfind('/');
    let skip_prefix_length = if let Some(index) = slash_index {
        index + 1
    } else {
        0
    };
    let exported_item = get_exported_item(db_conn, item_id, skip_prefix_length).await?;
    let result = fs::write(export_path, serde_json::to_string(&exported_item).unwrap());

    if let Err(err) = result {
        return Err(err.to_string());
    }

    Ok(())
}

async fn get_exported_item(
    db_conn: &DbConn,
    item_id: i32,
    skip_prefix_length: usize,
) -> Result<ExportedItem, String> {
    let item = file_service::get_by_id(db_conn, item_id).await?;
    let cells: Option<Vec<ExportedCell>> = if item.is_folder {
        None
    } else {
        Some(
            cell_service::get_file_cells_ordered_by_index(db_conn, item_id)
                .await?
                .into_iter()
                .map(ExportedCell::from)
                .collect(),
        )
    };
    let mut children: Option<Vec<ExportedItem>> = None;

    if item.is_folder {
        let folder_children = file_service::list_folder_children(db_conn, item_id).await?;
        let mut children_vec = Vec::with_capacity(folder_children.len());
        for folder_child in folder_children {
            children_vec.push(
                Box::pin(get_exported_item(
                    db_conn,
                    folder_child.id,
                    skip_prefix_length,
                ))
                .await?,
            );
        }
        children = Some(children_vec);
    }

    let exported_item = ExportedItem::new(
        item.path.chars().skip(skip_prefix_length).collect(),
        if item.is_folder {
            ExportedItemType::Folder
        } else {
            ExportedItemType::File
        },
        cells,
        children,
    );

    Ok(exported_item)
}

pub async fn import(
    db_conn: &DbConn,
    import_item_path: String,
    import_into_folder_id: i32,
) -> Result<(), String> {
    let import_file = match File::open(import_item_path) {
        Err(err) => return Err(err.to_string()),
        Ok(file) => file,
    };

    let exported_item: ExportedItem = match serde_json::from_reader(import_file) {
        Err(err) => return Err(err.to_string()),
        Ok(exported_item) => exported_item,
    };

    let import_into_folder_path = if import_into_folder_id == 0 {
        "".into()
    } else {
        file_service::get_by_id(db_conn, import_into_folder_id)
            .await?
            .path
    };

    let txn = match db_conn.begin().await {
        Ok(txn) => txn,
        Err(err) => return Err(err.to_string()),
    };

    import_exported_item(&txn, &exported_item, &import_into_folder_path).await?;

    let result = txn.commit().await;
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

async fn import_exported_item(
    db_conn: &impl ConnectionTrait,
    exported_item: &ExportedItem,
    parent_folder_path: &String,
) -> Result<(), String> {
    match exported_item.item_type {
        ExportedItemType::File => {
            import_file_from_exported_item(db_conn, exported_item, parent_folder_path).await
        }
        ExportedItemType::Folder => {
            Box::pin(import_folder_from_exported_item(
                db_conn,
                exported_item,
                parent_folder_path,
            ))
            .await
        }
    }
}

async fn import_file_from_exported_item(
    db_conn: &impl ConnectionTrait,
    exported_item: &ExportedItem,
    parent_folder_path: &String,
) -> Result<(), String> {
    let file_id = file_service::create_file(
        db_conn,
        format!("{parent_folder_path}/{}", exported_item.path),
    )
    .await?;

    if let Some(cells) = exported_item.cells.as_ref() {
        for (i, cell) in cells.iter().enumerate() {
            cell_service::create_cell_no_transaction(
                db_conn,
                file_id,
                &purify_html(&cell.content),
                &cell.cell_type,
                i as i32,
            )
            .await?;
        }
    }

    Ok(())
}

fn purify_html(html: &str) -> String {
    let handler = |el: &mut Element| {
        if el.tag_name().to_lowercase() == "script"
            || el
                .attributes()
                .iter()
                .any(|attr| attr.name().to_lowercase().starts_with("on"))
        {
            el.remove();
        }

        Ok(())
    };

    rewrite_str(
        html,
        RewriteStrSettings {
            element_content_handlers: vec![element!("*", handler)],
            ..RewriteStrSettings::default()
        },
    )
    .unwrap()
}

async fn import_folder_from_exported_item(
    db_conn: &impl ConnectionTrait,
    exported_item: &ExportedItem,
    parent_folder_path: &String,
) -> Result<(), String> {
    file_service::create_folder(
        db_conn,
        format!("{parent_folder_path}/{}", exported_item.path),
    )
    .await?;

    if let Some(children) = exported_item.children.as_ref() {
        for child in children {
            import_exported_item(db_conn, child, parent_folder_path).await?
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;
    use crate::{
        entity::cell::CellType,
        service::{
            repetition_service,
            tests::{create_file_cell_with_cell_type_and_content, get_db},
        },
        value_objects::{flash_card::FlashCard, true_false::TrueFalse},
    };
    use rand::prelude::*;

    fn get_random_file_path() -> PathBuf {
        let temp_dir = std::env::current_dir().unwrap().join("temp");

        if !temp_dir.exists() {
            std::fs::create_dir(&temp_dir).unwrap();
        }

        let mut rng = rand::rng();
        let mut file_name = String::new();

        for _ in 1..6 {
            file_name = format!("{}{}", file_name, rng.random::<char>());
        }

        temp_dir.join(format!("{file_name}.json"))
    }

    #[tokio::test]
    async fn export_file_exported_file_correctly() {
        // Arrange

        let db_conn = get_db().await;
        let file_content = serde_json::to_string(&FlashCard {
            question: "file content".into(),
            ..Default::default()
        })
        .unwrap();
        let (file_id, _) = create_file_cell_with_cell_type_and_content(
            &db_conn,
            "folder/file 1",
            CellType::FlashCard,
            &file_content,
        )
        .await;
        let export_path = get_random_file_path();

        // Act

        export(&db_conn, file_id, export_path.to_str().unwrap().into())
            .await
            .unwrap();

        // Assert

        let file = File::open(export_path.clone()).unwrap();
        let exported_item: ExportedItem = serde_json::from_reader(file).unwrap();

        assert_eq!(exported_item.item_type, ExportedItemType::File);
        assert_eq!(exported_item.path, "file 1".to_string());
        let cells = exported_item.cells.unwrap();
        assert_eq!(cells.len(), 1);
        assert_eq!(cells[0].content, file_content);
        assert_eq!(cells[0].cell_type, CellType::FlashCard);
    }

    #[tokio::test]
    async fn export_item_folder_exported_folder_correctly() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = file_service::create_folder(&db_conn, "folder 1/folder 2".into())
            .await
            .unwrap();
        create_file_cell_with_cell_type_and_content(
            &db_conn,
            "folder 1/folder 2/file 1",
            CellType::FlashCard,
            &serde_json::to_string(&FlashCard {
                question: "file content".into(),
                ..Default::default()
            })
            .unwrap(),
        )
        .await;
        create_file_cell_with_cell_type_and_content(
            &db_conn,
            "folder 1/folder 2/file 2",
            CellType::TrueFalse,
            &serde_json::to_string(&TrueFalse {
                question: "file content".into(),
                ..Default::default()
            })
            .unwrap(),
        )
        .await;
        create_file_cell_with_cell_type_and_content(
            &db_conn,
            "folder 1/folder 2/folder 3/file 3",
            CellType::Note,
            "file content",
        )
        .await;
        let export_path = get_random_file_path();

        // Act

        export(&db_conn, folder_id, export_path.to_str().unwrap().into())
            .await
            .unwrap();

        // Assert

        let file = File::open(export_path.clone()).unwrap();
        let exported_item: ExportedItem = serde_json::from_reader(file).unwrap();

        assert_eq!(exported_item.item_type, ExportedItemType::Folder);
        assert_eq!(exported_item.path, "folder 2".to_string());
        assert_eq!(exported_item.cells, None);
        let children = exported_item.children.unwrap();
        assert_eq!(children.len(), 3);

        let folder3 = children
            .iter()
            .find(|child| child.path == "folder 2/folder 3")
            .unwrap()
            .clone();
        assert_eq!(folder3.item_type, ExportedItemType::Folder);
        assert_eq!(folder3.cells, None);
        let folder3_children = folder3.children.unwrap();
        assert_eq!(folder3_children.len(), 1);

        let file3 = folder3_children
            .iter()
            .find(|child| child.path == "folder 2/folder 3/file 3".to_string())
            .unwrap()
            .clone();
        assert_eq!(file3.item_type, ExportedItemType::File);
        assert_eq!(file3.children, None);
        let file3_cells = file3.cells.unwrap();
        assert_eq!(file3_cells.len(), 1);
        assert_eq!(file3_cells[0].content, "file content");
        assert_eq!(file3_cells[0].cell_type, CellType::Note);
    }

    #[tokio::test]
    async fn import_valid_input_imported_file_correctly() {
        // Arrange

        let db_conn = get_db().await;
        let folder2_id = file_service::create_folder(&db_conn, "folder 1/folder 2".into())
            .await
            .unwrap();
        let file1_cell_content = serde_json::to_string(&FlashCard {
            question: "old content".into(),
            ..Default::default()
        })
        .unwrap();
        create_file_cell_with_cell_type_and_content(
            &db_conn,
            "folder 1/folder 2/file 1",
            CellType::FlashCard,
            &file1_cell_content,
        )
        .await;
        create_file_cell_with_cell_type_and_content(
            &db_conn,
            "folder 1/folder 2/file 2",
            CellType::TrueFalse,
            &serde_json::to_string(&TrueFalse {
                question: "old content".into(),
                ..Default::default()
            })
            .unwrap(),
        )
        .await;
        create_file_cell_with_cell_type_and_content(
            &db_conn,
            "folder 1/folder 2/folder 3/file 3",
            CellType::Note,
            "old content",
        )
        .await;

        let import_folder_id = file_service::create_folder(&db_conn, "import folder".into())
            .await
            .unwrap();

        let export_path = get_random_file_path();
        export(&db_conn, folder2_id, export_path.to_str().unwrap().into())
            .await
            .unwrap();

        // Act

        import(
            &db_conn,
            export_path.to_str().unwrap().into(),
            import_folder_id,
        )
        .await
        .unwrap();

        // Assert

        let import_folder_children =
            file_service::list_folder_children_recursively(&db_conn, import_folder_id)
                .await
                .unwrap();

        assert_eq!(import_folder_children.len(), 5);
        assert!(
            import_folder_children
                .iter()
                .any(|file| file.path == "import folder/folder 2" && file.is_folder)
        );
        assert!(
            import_folder_children
                .iter()
                .any(|file| file.path == "import folder/folder 2/file 1" && !file.is_folder)
        );
        assert!(
            import_folder_children
                .iter()
                .any(|file| file.path == "import folder/folder 2/file 2" && !file.is_folder)
        );
        assert!(
            import_folder_children
                .iter()
                .any(|file| file.path == "import folder/folder 2/folder 3" && file.is_folder)
        );
        assert!(
            import_folder_children.iter().any(|file| file.path
                == "import folder/folder 2/folder 3/file 3"
                && !file.is_folder)
        );

        let file1_id = import_folder_children
            .iter()
            .find(|file| file.path == "import folder/folder 2/file 1")
            .unwrap()
            .id;

        let file1_cells = cell_service::get_file_cells_ordered_by_index(&db_conn, file1_id)
            .await
            .unwrap();
        assert_eq!(file1_cells.len(), 1);
        assert_eq!(file1_cells[0].cell_type, CellType::FlashCard);
        assert_eq!(file1_cells[0].content, file1_cell_content);

        let file1_repetitions = repetition_service::get_file_repetitions(&db_conn, file1_id)
            .await
            .unwrap();
        assert_eq!(file1_repetitions.len(), 1);
    }

    #[tokio::test]
    async fn import_input_that_contains_javascript_removed_javascript() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = file_service::create_folder(&db_conn, "folder".into())
            .await
            .unwrap();
        let file_cell_content = serde_json::to_string(&FlashCard {
            question:
                "content<script>alert('hello')</script><button onLoad='alert'>button</button>"
                    .into(),
            ..Default::default()
        })
        .unwrap();
        create_file_cell_with_cell_type_and_content(
            &db_conn,
            "folder/file",
            CellType::FlashCard,
            &file_cell_content,
        )
        .await;

        let import_folder_id = file_service::create_folder(&db_conn, "import folder".into())
            .await
            .unwrap();

        let export_path = get_random_file_path();
        export(&db_conn, folder_id, export_path.to_str().unwrap().into())
            .await
            .unwrap();

        // Act

        import(
            &db_conn,
            export_path.to_str().unwrap().into(),
            import_folder_id,
        )
        .await
        .unwrap();

        // Assert

        let imported_file_id =
            file_service::list_folder_children_recursively(&db_conn, import_folder_id)
                .await
                .unwrap()[0]
                .id;
        let cells = cell_service::get_file_cells_ordered_by_index(&db_conn, imported_file_id)
            .await
            .unwrap();
        let is_javascript_existing = cells
            .iter()
            .any(|c| c.content.contains("script") || c.content.contains("onLoad"));
        assert!(!is_javascript_existing);
    }
}
