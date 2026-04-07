use std::ops::{Deref, DerefMut};

use sqlx::SqlitePool;
use tokio::sync::Mutex;

pub struct DbPool(Mutex<SqlitePool>);

impl DbPool {
    pub fn new(mutex: Mutex<SqlitePool>) -> Self {
        Self(mutex)
    }
}

impl Deref for DbPool {
    type Target = Mutex<SqlitePool>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for DbPool {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}
