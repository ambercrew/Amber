use std::sync::Arc;

use async_trait::async_trait;
use fractional_index::FractionalIndex;
use injector_derive::ScopeInjectable;

use crate::common::repository_error::RepositoryError;
use crate::elements::repositories::meta_repository::MetaRepository;
use crate::elements::services::element_index_service::ElementIndexService;
use crate::elements::value_objects::element_id::ElementId;

#[derive(ScopeInjectable)]
pub struct DefaultElementIndexService {
    meta_repository: Arc<dyn MetaRepository>,
}

#[async_trait]
impl ElementIndexService for DefaultElementIndexService {
    async fn get_new_last_index(
        &self,
        parent: Option<ElementId>,
    ) -> Result<FractionalIndex, RepositoryError> {
        let last = self.meta_repository.get_last_position(parent).await?;
        Ok(last
            .map(|p| FractionalIndex::new_after(&p))
            .unwrap_or_default())
    }
}
