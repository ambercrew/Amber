use std::sync::Arc;

use base64::{Engine as _, engine::general_purpose};
use brainy_core::{
    backend::traits::brainy_backend_client::BrainyBackendClient,
    common::traits::repositories_context::RepositoriesContext, generated_code::SyncObject,
    local_configurations::entities::LocalConfiguration, sync::sync_service::SyncService,
};
use prost::Message;
use tauri::State;
use tokio::sync::Mutex;

use crate::api::ApiError;

const LAST_SYNC_NUMBER_CONFIGURATION_NAME: &str = "LAST_SYNC_NUMBER";

// TODO: unit test
#[tauri::command]
pub async fn sync(
    context: State<'_, Arc<Mutex<dyn RepositoriesContext>>>,
    backend_client: State<'_, Box<dyn BrainyBackendClient>>,
    sync_service: State<'_, Arc<SyncService>>,
) -> Result<(), ApiError> {
    let mut context = context.lock().await;

    let mut sync_number_configuration = context
        .local_configuration_repository()
        .get_by_name(LAST_SYNC_NUMBER_CONFIGURATION_NAME)
        .await?
        .unwrap_or(LocalConfiguration {
            name: LAST_SYNC_NUMBER_CONFIGURATION_NAME.to_string(),
            value: "0".to_string(),
        });

    loop {
        let sync_number = sync_number_configuration.value.parse().unwrap();
        let dto = backend_client.get_next_sync_page(sync_number).await?;
        let bytes = general_purpose::STANDARD.decode(dto.sync_object).unwrap();

        let sync_object = match SyncObject::decode(&bytes[..]) {
            Ok(sync_object) => sync_object,
            Err(err) => {
                log::error!("Error while parsing {err:#?}");
                return Err(ApiError(
                    "An unknown error has happened while parsing the sync object.".to_string(),
                ));
            }
        };
        sync_service.process_sync_object(sync_object).await?;

        sync_number_configuration.value = dto.last_included_sync_number.to_string();
        context
            .local_configuration_repository()
            .upsert(&sync_number_configuration)
            .await?;

        context.save_changes().await?;

        if !dto.is_there_more_sync_objects {
            break;
        }
    }

    // TODO: send to server changes
    Ok(())
}
