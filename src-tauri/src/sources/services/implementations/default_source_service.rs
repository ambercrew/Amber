use std::sync::Arc;

use async_trait::async_trait;
use chrono::Utc;
use injector_derive::ScopeInjectable;
use uuid::Uuid;

use crate::common::repository_error::RepositoryError;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::value_objects::element_id::ElementId;
use crate::sources::entities::source::Source;
use crate::sources::repositories::source_repository::SourceRepository;
use crate::sources::services::source_service::{
    SourceFields, SourceService, SourceServiceError, SourceWithElementCount,
};

#[derive(ScopeInjectable)]
pub struct DefaultSourceService {
    source_repository: Arc<dyn SourceRepository>,
    meta_repository: Arc<dyn MetaRepository>,
}

#[async_trait]
impl SourceService for DefaultSourceService {
    async fn list_sources(&self) -> Result<Vec<SourceWithElementCount>, RepositoryError> {
        let sources = self.source_repository.get_all().await?;
        let mut result = Vec::with_capacity(sources.len());
        for source in sources {
            let element_count = self.meta_repository.count_by_source(source.id).await?;
            result.push(SourceWithElementCount {
                source,
                element_count,
            });
        }
        Ok(result)
    }

    async fn get_source(&self, id: Uuid) -> Result<SourceWithElementCount, RepositoryError> {
        let source = self.source_repository.get_by_id(id).await?;
        let element_count = self.meta_repository.count_by_source(id).await?;
        Ok(SourceWithElementCount {
            source,
            element_count,
        })
    }

    async fn create_or_reuse_source(
        &self,
        fields: SourceFields,
    ) -> Result<Source, RepositoryError> {
        if let Some(location) = fields.location.as_deref().filter(|l| !l.is_empty())
            && let Some(existing) = self.source_repository.find_by_location(location).await?
        {
            return Ok(existing);
        }

        let now = Utc::now();
        let source = Source {
            id: Uuid::new_v4(),
            created_at: now,
            modified_at: now,
            title: fields.title,
            authors: fields.authors,
            publication_date: fields.publication_date,
            source_type: fields.source_type,
            location: fields.location,
        };
        self.source_repository.create(&source).await?;
        Ok(source)
    }

    async fn update_source(
        &self,
        id: Uuid,
        fields: SourceFields,
    ) -> Result<Source, RepositoryError> {
        let existing = self.source_repository.get_by_id(id).await?;
        let source = Source {
            title: fields.title,
            authors: fields.authors,
            publication_date: fields.publication_date,
            source_type: fields.source_type,
            location: fields.location,
            ..existing
        };
        self.source_repository.update(&source).await?;
        Ok(source)
    }

    async fn delete_source(&self, id: Uuid) -> Result<(), RepositoryError> {
        self.source_repository.delete(id).await
    }

    async fn assign_source(
        &self,
        element_id: ElementId,
        source_id: Option<Uuid>,
    ) -> Result<(), SourceServiceError> {
        self.meta_repository
            .set_source(element_id, source_id)
            .await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use fractional_index::FractionalIndex;
    use injector::{injector::Injector, register_scope};

    use crate::{
        elements::value_objects::meta::Meta,
        infrastructure::repositories::sqlite::{
            sqlite_meta_repository::SqliteMetaRepository,
            sqlite_source_repository::SqliteSourceRepository,
        },
        sources::value_objects::source_type::SourceType,
        test_utils::create_test_injector,
    };

    use super::*;

    async fn initialize_test_injector() -> Injector {
        let mut injector = create_test_injector().await;
        register_scope!(injector, dyn MetaRepository, SqliteMetaRepository);
        register_scope!(injector, dyn SourceRepository, SqliteSourceRepository);
        register_scope!(injector, dyn SourceService, DefaultSourceService);
        injector
    }

    fn make_fields(location: Option<&str>) -> SourceFields {
        SourceFields {
            title: "test".into(),
            authors: None,
            publication_date: None,
            source_type: SourceType::WebPage,
            location: location.map(|l| l.to_string()),
        }
    }

    async fn make_element(
        meta_repository: &Arc<dyn MetaRepository>,
        parent: Option<ElementId>,
    ) -> ElementId {
        let element_id = ElementId::Folder(Uuid::new_v4());
        meta_repository
            .create_meta(&Meta {
                element_id,
                name: "test".into(),
                parent,
                position: FractionalIndex::default(),
                study_profile_id: None,
                source_id: None,
                derived_from: None,
                created_at: Utc::now(),
                modified_at: Utc::now(),
            })
            .await
            .unwrap();
        element_id
    }

    #[tokio::test]
    async fn create_or_reuse_source_no_location_always_creates_new() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn SourceService>().await;

        // Act

        let first = service
            .create_or_reuse_source(make_fields(None))
            .await
            .unwrap();
        let second = service
            .create_or_reuse_source(make_fields(None))
            .await
            .unwrap();

        // Assert

        assert_ne!(first.id, second.id);
    }

    #[tokio::test]
    async fn create_or_reuse_source_matching_location_reuses_existing() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let service = scope.resolve::<dyn SourceService>().await;
        let first = service
            .create_or_reuse_source(make_fields(Some("https://example.com")))
            .await
            .unwrap();

        // Act

        let second = service
            .create_or_reuse_source(make_fields(Some("https://example.com")))
            .await
            .unwrap();

        // Assert

        assert_eq!(first.id, second.id);
    }

    #[tokio::test]
    async fn assign_source_element_with_no_previous_source_sets_source() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repository = scope.resolve::<dyn MetaRepository>().await;
        let service = scope.resolve::<dyn SourceService>().await;
        let element_id = make_element(&meta_repository, None).await;
        let source = service
            .create_or_reuse_source(make_fields(None))
            .await
            .unwrap();

        // Act

        service
            .assign_source(element_id, Some(source.id))
            .await
            .unwrap();

        // Assert

        let meta = meta_repository.get_by_id(element_id.id()).await.unwrap();
        assert_eq!(Some(source.id), meta.source_id);
    }

    #[tokio::test]
    async fn assign_source_clear_source_removes_it_from_element() {
        // Arrange

        let injector = initialize_test_injector().await;
        let scope = injector.start_scope();
        let meta_repository = scope.resolve::<dyn MetaRepository>().await;
        let service = scope.resolve::<dyn SourceService>().await;
        let element_id = make_element(&meta_repository, None).await;
        let source = service
            .create_or_reuse_source(make_fields(None))
            .await
            .unwrap();
        service
            .assign_source(element_id, Some(source.id))
            .await
            .unwrap();

        // Act

        service.assign_source(element_id, None).await.unwrap();

        // Assert

        let meta = meta_repository.get_by_id(element_id.id()).await.unwrap();
        assert_eq!(None, meta.source_id);
    }
}
