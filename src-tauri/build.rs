use std::{env, fs, path::PathBuf, process::Command};

fn main() {
    setup_sqlx();
    tauri_build::build()
}

fn setup_sqlx() {
    let current_directory = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let db_path = current_directory.join("temp.db");
    let db_url = format!("sqlite:///{}?mode=rwc", db_path.display());

    let env_file = current_directory.join(".env");
    println!("cargo:warning=.env file path is {}", env_file.display());

    if !env_file.exists() {
        let env_content = format!("DATABASE_URL=\"{0}\"", db_url);
        fs::write(&env_file, env_content).expect("Cannot write .env variable.");
        println!("cargo:warning=.env file created");
    } else {
        println!("cargo:warning=.env already exists");
    }

    if db_path.exists() {
        fs::remove_file(&db_path).expect("Cannot remove database");
        println!("cargo:warning=removed previous temp.db file");
    }

    let output = Command::new("sqlx")
        .args([
            "migrate",
            "run",
            "--source",
            "brainy_core/db",
            "--database-url",
            &db_url,
        ])
        .output()
        .expect("Could not run sqlx command, ensure that it is installed");

    if output.status.success() {
        println!(
            "cargo:warning=migration is applied to {}",
            db_path.display()
        );
    } else {
        println!(
            "cargo:warning=Migration failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        std::process::exit(1);
    }
}
