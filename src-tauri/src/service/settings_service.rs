use dirs;
use sea_orm::DbConn;
use std::{
    fs::{self, File},
    path::PathBuf,
};
use tokio::sync::Mutex;

use crate::{
    dto::update_settings_request::UpdateSettingsRequest,
    util::database_util::load_database,
    value_objects::settings::{Settings, Theme},
};

#[cfg(not(dev))]
const SETTINGS_FILE_NAME: &str = "settings.json";
#[cfg(dev)]
const SETTINGS_FILE_NAME: &str = "settings.dev.json";

const DEFAULT_DATABASE_FILE_NAME: &str = "brainy.db";

pub fn init_settings() {
    let settings_dir = get_settings_dir();
    if !settings_dir.join(SETTINGS_FILE_NAME).exists() {
        let settings = Settings::new(
            settings_dir
                .join(DEFAULT_DATABASE_FILE_NAME)
                .to_str()
                .unwrap()
                .into(),
            Theme::FollowSystem,
            100f32,
        );
        write_settings_to_disk(&settings);
    }
}

pub async fn update_settings(new_settings: UpdateSettingsRequest, db_conn: &Mutex<DbConn>) {
    let mut settings = get_settings();
    if let Some(database_location) = new_settings.database_location {
        let mut db_conn = db_conn.lock().await;
        *db_conn = load_database(&database_location).await;
        settings.database_location = database_location;
    }
    if let Some(theme) = new_settings.theme {
        settings.theme = theme;
    }
    if let Some(zoom_percentage) = new_settings.zoom_percentage {
        settings.zoom_percentage = zoom_percentage;
    }
    write_settings_to_disk(&settings);
}

fn write_settings_to_disk(settings: &Settings) {
    fs::write(
        get_settings_dir().join(SETTINGS_FILE_NAME),
        serde_json::to_string(settings).unwrap(),
    )
    .expect("Cannot write to settings file");
}

pub fn get_settings() -> Settings {
    let settings_path = get_settings_dir().join(SETTINGS_FILE_NAME);
    let file = File::open(settings_path).expect("Cannot read settings file");
    serde_json::from_reader(file).expect("Cannot parse settings!")
}

fn get_settings_dir() -> PathBuf {
    let dir_path = dirs::config_dir()
        .expect("No settings directory is found on your system!")
        .join("Brainy");
    fs::create_dir_all(dir_path.clone()).expect("Cannot create settings directory!");
    dir_path
}
