use std::ops::{Deref, DerefMut};

use sqlx::{Sqlite, Transaction};
use tokio::sync::Mutex;

pub type SqliteTransaction = Transaction<'static, Sqlite>;

pub struct DbTransaction(Mutex<SqliteTransaction>);

impl DbTransaction {
    pub fn new(mutex: Mutex<SqliteTransaction>) -> Self {
        Self(mutex)
    }
}

impl Deref for DbTransaction {
    type Target = Mutex<SqliteTransaction>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for DbTransaction {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}
