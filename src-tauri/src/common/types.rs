pub type Guid = uuid::Uuid;
pub type SourceError = Box<dyn std::error::Error + Send + Sync + 'static>;
