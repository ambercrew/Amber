use std::{env, fs, path::PathBuf, str::FromStr};

use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

fn main() {
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            setup_sqlx().await;
        });

    setup_store_flag();
    prost_build::compile_protos(&["protobuff/sync_objects.proto"], &["protobuff/"]).unwrap();
    tauri_build::build()
}

fn setup_store_flag() {
    println!("cargo::rustc-check-cfg=cfg(store)");
    println!("cargo:rerun-if-env-changed=STORE_BUILD");
    if env::var("STORE_BUILD").is_ok() || cfg!(feature = "store") {
        println!("cargo:rustc-cfg=store");
    }
}

async fn setup_sqlx() {
    println!("cargo:rerun-if-changed=migrations/");

    let current_directory = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let db_path = current_directory.join("temp.db");
    let db_url = format!("sqlite:///{}?mode=rwc", db_path.display()).replace("\\", "\\\\");

    let env_file = current_directory.join(".env");
    println!(".env file path is {}", env_file.display());

    if env_file.exists() {
        println!(".env already exists, deleting it.");
        fs::remove_file(&env_file).expect("Cannot remove old .env file");
    }

    let env_content = format!("DATABASE_URL=\"{0}\"", db_url);
    fs::write(&env_file, env_content).expect("Cannot write .env variable");
    println!(".env file created");

    // Sometimes .env file is not used in Windows.
    println!("cargo:rustc-env=DATABASE_URL={db_url}");
    unsafe {
        std::env::set_var("DATABASE_URL", &db_url);
    }
    println!("Environment variable set");

    if db_path.exists() {
        fs::remove_file(&db_path).expect("Cannot remove database");
        println!("removed previous temp.db file");
    }

    let options = SqliteConnectOptions::from_str(&db_url)
        .expect("Could not create sqlite connect options!")
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .connect_with(options)
        .await
        .expect("Cannot connect to database");
    sqlx::migrate!("./migrations/")
        .run(&pool)
        .await
        .expect("Error applying the migrations!");
}
