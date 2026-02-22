use std::{env, path::PathBuf, sync::Arc};

use injector::injector::Injector;
use tokio::fs;

use crate::{
    Guid,
    common::utils::{create_injector::register_scoped_tx, create_sqlite_pool::create_sqlite_pool},
};

pub async fn create_temp_directory() -> PathBuf {
    let path = env::temp_dir().join(Guid::new_v4().to_string());
    fs::create_dir_all(path.clone()).await.unwrap();
    path
}

pub async fn create_test_injector() -> Injector {
    let mut injector = Injector::default();
    let pool = create_sqlite_pool("sqlite::memory:").await.unwrap();
    injector.register_singleton(Arc::new(pool));
    register_scoped_tx(&mut injector);
    injector
}
