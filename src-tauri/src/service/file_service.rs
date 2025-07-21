use prelude::Expr;
use sea_orm::{DbConn, entity::*, query::*};

use crate::{dto::file_with_repetitions_count::FileWithRepetitionsCount, entity::file};

use super::repetition_service;

pub async fn get_files(db_conn: &DbConn) -> Result<Vec<FileWithRepetitionsCount>, String> {
    let result = file::Entity::find().all(db_conn).await;
    let files = match result {
        Ok(result) => result,
        Err(err) => return Err(err.to_string()),
    };

    let mut files_with_repetitions_counts: Vec<FileWithRepetitionsCount> = vec![];
    for file in files {
        let repetition_counts = if file.is_folder {
            None
        } else {
            Some(repetition_service::get_study_repetition_counts(db_conn, file.id).await?)
        };

        files_with_repetitions_counts.push(FileWithRepetitionsCount::new(
            file.id,
            file.path,
            file.is_folder,
            repetition_counts,
        ));
    }

    Ok(files_with_repetitions_counts)
}

pub async fn create_file(db_conn: &impl ConnectionTrait, path: String) -> Result<i32, String> {
    let path = path.trim_matches('/').to_string();
    if path.trim().is_empty() {
        return Err("Name cannot be empty!".into());
    }
    if path.contains("/") {
        create_folder_recursively(db_conn, &get_folder_path(&path)).await?;
    }
    if file_exists(db_conn, path.clone()).await? {
        return Err("File already exists!".into());
    }

    let active_model = file::ActiveModel {
        path: Set(path),
        is_folder: Set(false),
        ..Default::default()
    };

    let result = active_model.insert(db_conn).await;
    match result {
        Ok(insert_result) => Ok(insert_result.id),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn create_folder(db_conn: &impl ConnectionTrait, path: String) -> Result<i32, String> {
    let path = path.trim_matches('/').to_string();
    if path.trim().is_empty() {
        return Err("Name cannot be empty!".into());
    }
    if folder_exists(db_conn, path.clone()).await? {
        return Err("Folder already exists!".into());
    }
    create_folder_recursively(db_conn, &path).await
}

pub async fn delete_file(db_conn: &DbConn, file_id: i32) -> Result<(), String> {
    let result = file::Entity::delete_many()
        .filter(file::Column::Id.eq(file_id))
        .exec(db_conn)
        .await;

    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn delete_folder(db_conn: &DbConn, folder_id: i32) -> Result<(), String> {
    let folder = get_by_id(db_conn, folder_id).await?;

    let txn = match db_conn.begin().await {
        Ok(txn) => txn,
        Err(err) => return Err(err.to_string()),
    };

    let result = file::Entity::delete_many()
        .filter(file::Column::Path.starts_with(folder.path + "/"))
        .exec(&txn)
        .await;
    if let Err(err) = result {
        return Err(err.to_string());
    }

    let result = file::Entity::delete_many()
        .filter(file::Column::Id.eq(folder_id))
        .exec(&txn)
        .await;
    if let Err(err) = result {
        return Err(err.to_string());
    }

    let result = txn.commit().await;
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn move_file(
    db_conn: &DbConn,
    file_id: i32,
    destination_folder_id: i32,
) -> Result<(), String> {
    let file = get_by_id(db_conn, file_id).await?;
    let destination_path = if destination_folder_id == 0 {
        "".into()
    } else {
        get_by_id(db_conn, destination_folder_id).await?.path
    };

    if destination_path == get_folder_path(&file.path) {
        return Ok(());
    }
    let file_name = get_file_name(&file.path);
    let new_path = if destination_path.is_empty() {
        file_name
    } else {
        destination_path + "/" + file_name.as_str()
    };

    if file_exists(db_conn, new_path.clone()).await? {
        return Err("another file with the same name exists!".into());
    }

    update_path(db_conn, file_id, new_path).await
}

pub async fn move_folder(
    db_conn: &DbConn,
    folder_id: i32,
    destination_folder_id: i32,
) -> Result<(), String> {
    let folder = get_by_id(db_conn, folder_id).await?;
    let destination_path = if destination_folder_id == 0 {
        "".into()
    } else {
        get_by_id(db_conn, destination_folder_id).await?.path
    };

    if destination_path == folder.path || destination_path == get_folder_path(&folder.path) {
        return Ok(());
    } else if destination_path.starts_with((folder.path.clone() + "/").as_str()) {
        return Err("You cannot move into an inner folder!".into());
    }
    let folder_name = get_file_name(&folder.path);
    let new_path = if destination_path.is_empty() {
        folder_name
    } else {
        destination_path + "/" + folder_name.as_str()
    };

    if folder_exists(db_conn, new_path.clone()).await? {
        return Err("Another folder with the same name exists!".into());
    }

    let folder_children = list_folder_children_recursively(db_conn, folder_id).await?;

    update_path(db_conn, folder_id, new_path.clone()).await?;

    for child in folder_children {
        let new_row_path = new_path.clone()
            + child
                .path
                .chars()
                .skip(folder.path.len())
                .collect::<String>()
                .as_str();
        update_path(db_conn, child.id, new_row_path).await?;
    }

    Ok(())
}

pub async fn rename_file(db_conn: &DbConn, file_id: i32, new_name: String) -> Result<(), String> {
    let new_name = new_name.trim_matches('/').to_string();
    if new_name.trim().is_empty() {
        return Err("Please enter a non empty name!".into());
    }

    let file = get_by_id(db_conn, file_id).await?;

    let new_path = apply_new_name(&file.path, &new_name);
    if file.path == new_path {
        return Ok(());
    }

    if file_exists(db_conn, new_path.clone()).await? {
        return Err("Another file with the same name already exists!".into());
    }

    create_folder_recursively(db_conn, &get_folder_path(&new_path)).await?;

    update_path(db_conn, file_id, new_path).await
}

async fn file_exists(db_conn: &impl ConnectionTrait, path: String) -> Result<bool, String> {
    let result = file::Entity::find()
        .filter(file::Column::Path.eq(path))
        .filter(file::Column::IsFolder.eq(false))
        .count(db_conn)
        .await;

    match result {
        Ok(result) => Ok(result > 0),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn rename_folder(
    db_conn: &DbConn,
    folder_id: i32,
    new_name: String,
) -> Result<(), String> {
    let new_name = new_name.trim_matches('/').to_string();
    if new_name.trim().is_empty() {
        return Err("Please enter a non empty name!".into());
    }

    let folder = get_by_id(db_conn, folder_id).await?;
    let new_path = apply_new_name(&folder.path, &new_name);

    if new_path == folder.path {
        return Ok(());
    }

    if folder_exists(db_conn, new_path.clone()).await? {
        return Err("Another folder with the same name already exists!".into());
    }

    let folder_children = list_folder_children_recursively(db_conn, folder_id).await?;

    update_path(db_conn, folder_id, new_path.clone()).await?;
    create_folder_recursively(db_conn, &get_folder_path(&new_path)).await?;

    // Moving child elements.
    for child in folder_children {
        let new_row_path = new_path.clone()
            + child
                .path
                .chars()
                .skip(folder.path.len())
                .collect::<String>()
                .as_str();
        update_path(db_conn, child.id, new_row_path).await?;
    }

    Ok(())
}

pub async fn list_folder_children_recursively(
    db_conn: &DbConn,
    id: i32,
) -> Result<Vec<file::Model>, String> {
    let folder = get_by_id(db_conn, id).await?;
    let result = file::Entity::find()
        .filter(file::Column::Path.starts_with(folder.path + "/"))
        .all(db_conn)
        .await;
    match result {
        Ok(rows) => Ok(rows),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn list_folder_children(db_conn: &DbConn, id: i32) -> Result<Vec<file::Model>, String> {
    let folder = get_by_id(db_conn, id).await?;
    let folder_children = list_folder_children_recursively(db_conn, id).await?;
    let slashes_count = folder.path.chars().filter(|c| *c == '/').count();
    Ok(folder_children
        .into_iter()
        .filter(|sub_file| sub_file.path.chars().filter(|c| *c == '/').count() == slashes_count + 1)
        .collect())
}

async fn update_path(db_conn: &DbConn, id: i32, new_path: String) -> Result<(), String> {
    let result = file::Entity::update_many()
        .col_expr(file::Column::Path, Expr::value(new_path))
        .filter(file::Column::Id.eq(id))
        .exec(db_conn)
        .await;
    match result {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

pub async fn get_by_id(db_conn: &DbConn, id: i32) -> Result<file::Model, String> {
    let result = file::Entity::find_by_id(id).one(db_conn).await;
    match result {
        Ok(result) => Ok(result.unwrap()),
        Err(err) => Err(err.to_string()),
    }
}

async fn create_folder_recursively(
    db_conn: &impl ConnectionTrait,
    path: &str,
) -> Result<i32, String> {
    let mut current_path = String::new();
    // The id of the folder with the full path
    let mut folder_id = 0;

    for name in path.split("/") {
        if !current_path.is_empty() {
            current_path.push('/');
        }
        current_path.push_str(name);
        if current_path.is_empty() {
            continue;
        }

        if !folder_exists(db_conn, current_path.to_string()).await? {
            let active_model = file::ActiveModel {
                path: Set(current_path.clone()),
                is_folder: Set(true),
                ..Default::default()
            };

            let result = active_model.insert(db_conn).await;
            folder_id = match result {
                Ok(insert_result) => insert_result.id,
                Err(err) => return Err(err.to_string()),
            }
        }
    }

    Ok(folder_id)
}

async fn folder_exists(db_conn: &impl ConnectionTrait, path: String) -> Result<bool, String> {
    let result = file::Entity::find()
        .filter(file::Column::Path.eq(path))
        .filter(file::Column::IsFolder.eq(true))
        .count(db_conn)
        .await;

    match result {
        Ok(result) => Ok(result > 0),
        Err(err) => Err(err.to_string()),
    }
}

fn get_file_name(path: &str) -> String {
    let index = path.rfind("/");
    match index {
        Some(index) => path.chars().skip(index + 1).collect(),
        None => path.to_owned(),
    }
}

fn get_folder_path(path: &str) -> String {
    let index = path.rfind("/");
    match index {
        Some(index) => path.chars().take(index).collect::<String>(),
        None => "".into(),
    }
}

fn apply_new_name(path: &str, new_name: &String) -> String {
    let index = path.rfind("/");
    match index {
        Some(index) => path.chars().take(index + 1).collect::<String>() + new_name.as_str(),
        None => new_name.to_owned(),
    }
}

#[cfg(test)]
pub mod tests {
    use crate::{
        entity::cell::{self, CellType},
        service::{cell_service, tests::get_db},
    };

    use super::*;

    #[tokio::test]
    async fn get_files_valid_input_returned_files() {
        // Arrange

        let db_conn = get_db().await;
        create_file(&db_conn, "file".into()).await.unwrap();
        create_folder(&db_conn, "folder".into()).await.unwrap();

        // Act

        let actual = get_files(&db_conn).await.unwrap();

        // Assert

        assert_eq!(actual.len(), 2);
        assert!(actual.iter().any(|f| f.path == "file".to_string()));
        assert!(actual.iter().any(|f| f.path == "folder".to_string()));
    }

    #[tokio::test]
    async fn create_folder_nested_path_created_all_folders() {
        // Arrange

        let db_conn = get_db().await;

        // Act

        create_folder(&db_conn, "folder 1/folder 2/".into())
            .await
            .unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert_eq!(actual.len(), 2);
        assert!(actual.iter().any(|f| f.path == "folder 1".to_string()));
        assert!(
            actual
                .iter()
                .any(|f| f.path == "folder 1/folder 2".to_string())
        );
    }

    #[tokio::test]
    async fn create_folder_empty_name_returned_error() {
        // Arrange

        let db_conn = get_db().await;

        // Act

        let actual = create_folder(&db_conn, "  ".into()).await;

        // Assert

        assert_eq!(actual, Err("Name cannot be empty!".to_string()));
    }

    #[tokio::test]
    async fn create_folder_existing_folder_returned_error() {
        // Arrange

        let db_conn = get_db().await;
        create_folder(&db_conn, "folder 1".into()).await.unwrap();

        // Act

        let actual = create_folder(&db_conn, "folder 1".into()).await;

        // Assert

        assert_eq!(actual, Err("Folder already exists!".to_string()));
    }

    #[tokio::test]
    async fn create_file_empty_name_returned_error() {
        // Arrange

        let db_conn = get_db().await;

        // Act

        let actual = create_file(&db_conn, "  ".into()).await;

        // Assert

        assert_eq!(actual, Err("Name cannot be empty!".to_string()));
    }

    #[tokio::test]
    async fn create_file_existing_file_returned_error() {
        // Arrange

        let db_conn = get_db().await;
        create_file(&db_conn, "file 1".into()).await.unwrap();

        // Act

        let actual = create_file(&db_conn, "file 1".into()).await;

        // Assert

        assert_eq!(actual, Err("File already exists!".to_string()));
    }

    #[tokio::test]
    async fn delete_file_valid_input_deleted_file() {
        // Arrange

        let db_conn = get_db().await;
        let file1_id = create_folder(&db_conn, "test".into()).await.unwrap();
        create_file(&db_conn, "test".into()).await.unwrap();

        cell_service::create_cell(&db_conn, file1_id, "".into(), CellType::Note, 0)
            .await
            .unwrap();

        let file2_id = create_file(&db_conn, "test 2".into()).await.unwrap();
        cell_service::create_cell(&db_conn, file2_id, "".into(), CellType::Note, 0)
            .await
            .unwrap();

        // Act

        delete_file(&db_conn, file1_id).await.unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert_eq!(actual.len(), 2);
        let cell_counts = cell::Entity::find().all(&db_conn).await.unwrap();
        assert_eq!(cell_counts.len(), 1);
    }

    #[tokio::test]
    async fn delete_folder_valid_input_deleted_folder() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = create_folder(&db_conn, "test".into()).await.unwrap();
        let file1_id = create_file(&db_conn, "test/file".into()).await.unwrap();
        cell_service::create_cell(&db_conn, file1_id, "".into(), CellType::Note, 0)
            .await
            .unwrap();

        let file2_id = create_file(&db_conn, "test".into()).await.unwrap();
        cell_service::create_cell(&db_conn, file2_id, "".into(), CellType::Note, 0)
            .await
            .unwrap();

        // Act

        delete_folder(&db_conn, folder_id).await.unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert_eq!(actual.len(), 1);
        let cell_counts = cell::Entity::find().all(&db_conn).await.unwrap();
        assert_eq!(cell_counts.len(), 1);
    }

    #[tokio::test]
    async fn move_file_valid_input_moved_file() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "test/file".into()).await.unwrap();
        let destination_folder_id = create_folder(&db_conn, "test 2".into()).await.unwrap();

        // Act

        move_file(&db_conn, file_id, destination_folder_id)
            .await
            .unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert_eq!(actual[1].path, "test 2/file".to_string());
    }

    #[tokio::test]
    async fn move_file_move_to_root_moved_file() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "test/file".into()).await.unwrap();

        // Act

        move_file(&db_conn, file_id, 0).await.unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert_eq!(actual[1].path, "file".to_string());
    }

    #[tokio::test]
    async fn move_file_existing_file_error_returned() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "test/file".into()).await.unwrap();
        create_file(&db_conn, "file".into()).await.unwrap();

        // Act

        let actual = move_file(&db_conn, file_id, 0).await;

        // Assert

        assert_eq!(
            actual,
            Err("another file with the same name exists!".to_string())
        );
    }

    #[tokio::test]
    async fn move_folder_valid_input_moved_folder() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = create_folder(&db_conn, "test".into()).await.unwrap();
        let destination_folder_id = create_folder(&db_conn, "destination".into()).await.unwrap();

        create_file(&db_conn, "test/folder 1/folder 2/file".into())
            .await
            .unwrap();
        create_file(&db_conn, "test/file".into()).await.unwrap();

        // Act

        move_folder(&db_conn, folder_id, destination_folder_id)
            .await
            .unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert!(actual.iter().any(|f| f.path == "destination".to_string()));
        assert!(
            actual
                .iter()
                .any(|f| f.path == "destination/test/folder 1".to_string())
        );
        assert!(
            actual
                .iter()
                .any(|f| f.path == "destination/test/folder 1/folder 2".to_string())
        );
        assert!(
            actual
                .iter()
                .any(|f| f.path == "destination/test/folder 1/folder 2/file".to_string())
        );
        assert!(
            actual
                .iter()
                .any(|f| f.path == "destination/test/file".to_string())
        );
    }

    #[tokio::test]
    async fn move_folder_move_to_root_moved_folder() {
        // Arrange

        let db_conn = get_db().await;
        create_folder(&db_conn, "test".into()).await.unwrap();
        let folder_id = create_folder(&db_conn, "test/folder 1".into())
            .await
            .unwrap();

        create_file(&db_conn, "test/folder 1/folder 2/file".into())
            .await
            .unwrap();
        create_file(&db_conn, "test/file".into()).await.unwrap();

        // Act

        move_folder(&db_conn, folder_id, 0).await.unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert!(actual.iter().any(|f| f.path == "test".to_string()));
        assert!(actual.iter().any(|f| f.path == "folder 1".to_string()));
        assert!(
            actual
                .iter()
                .any(|f| f.path == "folder 1/folder 2".to_string())
        );
        assert!(
            actual
                .iter()
                .any(|f| f.path == "folder 1/folder 2/file".to_string())
        );
        assert!(actual.iter().any(|f| f.path == "test/file".to_string()));
    }

    #[tokio::test]
    async fn move_folder_move_to_inner_folder_error_returned() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = create_folder(&db_conn, "test".into()).await.unwrap();
        let inner_folder_id = create_folder(&db_conn, "test/folder 1".into())
            .await
            .unwrap();

        // Act

        let actual = move_folder(&db_conn, folder_id, inner_folder_id).await;

        // Assert

        assert_eq!(
            actual,
            Err("You cannot move into an inner folder!".to_string())
        );
    }

    #[tokio::test]
    async fn move_folder_existing_folder_error_returned() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = create_folder(&db_conn, "test/folder 1".into())
            .await
            .unwrap();
        create_folder(&db_conn, "folder 1".into()).await.unwrap();

        // Act

        let actual = move_folder(&db_conn, folder_id, 0).await;

        // Assert

        assert_eq!(
            actual,
            Err("Another folder with the same name exists!".to_string())
        );
    }

    #[tokio::test]
    async fn rename_file_inside_folder_renamed_file() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "folder/test".into()).await.unwrap();

        // Act

        rename_file(&db_conn, file_id, "/new name/".into())
            .await
            .unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert_eq!(actual[1].path, "folder/new name".to_string());
    }

    #[tokio::test]
    async fn rename_file_placed_on_root_file_renamed() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "test".into()).await.unwrap();

        // Act

        rename_file(&db_conn, file_id, "/new name/".into())
            .await
            .unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert_eq!(actual[0].path, "new name".to_string());
    }

    #[tokio::test]
    async fn rename_file_existing_file_error_returned() {
        // Arrange

        let db_conn = get_db().await;
        let file_id = create_file(&db_conn, "test".into()).await.unwrap();
        create_file(&db_conn, "new name".into()).await.unwrap();

        // Act

        let actual = rename_file(&db_conn, file_id, "/new name/".into()).await;

        // Assert

        assert_eq!(
            actual,
            Err("Another file with the same name already exists!".into())
        );
    }

    #[tokio::test]
    async fn rename_folder_valid_input_renamed_folder() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = create_folder(&db_conn, "folder 1".into()).await.unwrap();
        create_file(&db_conn, "folder 1/folder 2/file".into())
            .await
            .unwrap();
        create_file(&db_conn, "folder 1/folder 2/folder 3/file".into())
            .await
            .unwrap();

        // Act

        rename_folder(&db_conn, folder_id, "/new name/subfolder".into())
            .await
            .unwrap();

        // Assert

        let actual = get_files(&db_conn).await.unwrap();
        assert!(
            actual
                .iter()
                .any(|f| f.path == "new name/subfolder".to_string())
        );
        assert!(
            actual
                .iter()
                .any(|f| f.path == "new name/subfolder/folder 2".to_string())
        );
        assert!(
            actual
                .iter()
                .any(|f| f.path == "new name/subfolder/folder 2/file".to_string())
        );
        assert!(
            actual
                .iter()
                .any(|f| f.path == "new name/subfolder/folder 2/folder 3".to_string())
        );
        assert!(
            actual
                .iter()
                .any(|f| f.path == "new name/subfolder/folder 2/folder 3/file".to_string())
        );
    }

    #[tokio::test]
    async fn rename_folder_existing_folder_returned_error() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = create_folder(&db_conn, "folder 1".into()).await.unwrap();
        create_folder(&db_conn, "folder 2".into()).await.unwrap();

        // Act

        let actual = rename_folder(&db_conn, folder_id, "folder 2".into()).await;

        // Assert

        assert_eq!(
            actual,
            Err("Another folder with the same name already exists!".into())
        );
    }

    #[tokio::test]
    async fn list_folder_children_valid_input_returned_correct_files() {
        // Arrange

        let db_conn = get_db().await;
        let folder_id = create_folder(&db_conn, "folder 1".into()).await.unwrap();
        create_folder(&db_conn, "folder 1/folder 2/ folder 3".into())
            .await
            .unwrap();
        create_folder(&db_conn, "folder 1/folder 4".into())
            .await
            .unwrap();
        create_file(&db_conn, "folder 1/file 1".into())
            .await
            .unwrap();
        create_file(&db_conn, "folder 1/folder 2/file 2".into())
            .await
            .unwrap();

        // Act

        let actual = list_folder_children(&db_conn, folder_id).await.unwrap();

        // Assert

        assert_eq!(actual.len(), 3);

        assert!(
            actual
                .iter()
                .any(|f| f.path == "folder 1/folder 2".to_string())
        );

        assert!(
            actual
                .iter()
                .any(|f| f.path == "folder 1/folder 4".to_string())
        );

        assert!(
            actual
                .iter()
                .any(|f| f.path == "folder 1/file 1".to_string())
        );
    }
}
