use sqlx::{Sqlite, SqlitePool, Transaction};
use tokio::sync::Mutex;

pub mod api_error;
pub mod extensions;
pub mod repository_error;
pub mod unit_of_work_ext;
pub mod utils;

pub type DbTransaction = Transaction<'static, Sqlite>;
pub type DbPool = Mutex<SqlitePool>;
