pub mod ai_integration;
pub mod backend;
pub mod backup;
pub mod cells;
pub mod common;
pub mod file_system;
pub mod fsrs;
pub mod local_configurations;
pub mod settings;
pub mod sync;
#[cfg(test)]
pub mod test_utils;

pub type Guid = uuid::Uuid;

pub const ROOT_FOLDER_ID: Guid = uuid::uuid!("00000000-0000-0000-0000-000000000001");
pub const DEFAULT_FSRS_PROFILE_ID: Guid = uuid::uuid!("00000000-0000-0000-0000-000000000002");

pub mod generated_code {
    include!(concat!(env!("OUT_DIR"), "/generated_code.rs"));
}
