pub mod cells;
pub mod common;
pub mod file_system;
pub mod settings;
pub mod sync;

pub type Guid = uuid::Uuid;

pub const ROOT_FOLDER_ID: Guid = uuid::uuid!("00000000-0000-0000-0000-000000000001");
