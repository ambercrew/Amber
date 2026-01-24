use std::{env, fs, path::PathBuf, process::Command};

fn main() {
    setup_sqlx();
    tauri_build::build()
}

fn setup_sqlx() {
    let current_directory = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let db_path = current_directory.join("temp.db");

    let env_file = current_directory.join(".env");
    if !env_file.exists() {
        let env_content = format!("DATABASE_URL=\"sqlite:///{}?mode=rwc\"", db_path.display());
        fs::write(&env_file, env_content).expect("Cannot write .env variable.");
        println!("✅ .env file created");
    }

    if db_path.exists() {
        fs::remove_file(&db_path).expect("Cannot remove database");
        println!("✅ removed previous temp.db file");
    }

    let output = Command::new("sqlx")
        .args(["migrate", "run", "--source", "brainy_core/db"])
        .output()
        .expect("Could not run sqlx command, ensure that it is installed");

    if !output.status.success() {
        eprintln!(
            "Migration failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        std::process::exit(1);
    } else {
        println!("✅ migration is applied to {}", db_path.display());
    }
}
