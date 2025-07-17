use std::fmt::Write;

use sea_orm::sea_query::Iden;
use sea_orm::{Database, DatabaseConnection};

use crate::migration;

pub async fn load_database(path: &String) -> DatabaseConnection {
    let db_conn = Database::connect(format!("sqlite:///{path}?mode=rwc"))
        .await
        .expect("Cannot open the database");
    migration::setup_schema(&db_conn)
        .await
        .expect("Could not setup the database schema!");
    db_conn
}

pub struct DateTimeToDate;

impl Iden for DateTimeToDate {
    fn unquoted(&self, s: &mut dyn Write) {
        write!(s, "DATE").unwrap();
    }
}
