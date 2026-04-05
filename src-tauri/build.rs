use std::{env, fs, path::PathBuf, process::Command};

fn main() {
    setup_sqlx();
    prost_build::compile_protos(&["protobuff/sync_objects.proto"], &["protobuff/"]).unwrap();
    tauri_build::build()
}

fn setup_sqlx() {
    println!("cargo:rerun-if-changed=migrations/");

    let current_directory = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let db_path = current_directory.join("temp.db");
    let db_url = format!("sqlite:///{}?mode=rwc", db_path.display());

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

    let output = Command::new("sqlx")
        .args(["migrate", "run", "--source", "migrations"])
        .output()
        .expect("Could not run sqlx command, ensure that it is installed");

    if output.status.success() {
        println!("migration is applied to {}", db_path.display());
    } else {
        println!(
            "Migration failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        std::process::exit(1);
    }
}
