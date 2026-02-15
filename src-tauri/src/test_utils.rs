use std::{env, path::PathBuf};

use tokio::fs;

use crate::Guid;

pub async fn create_temp_directory() -> PathBuf {
    let path = env::temp_dir().join(Guid::new_v4().to_string());
    fs::create_dir_all(path.clone()).await.unwrap();
    path
}
