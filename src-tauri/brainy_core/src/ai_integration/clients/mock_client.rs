use std::sync::Arc;

use async_stream::stream;
use rig::{
    completion::{self, CompletionError, CompletionModel, CompletionRequest, CompletionResponse},
    streaming::{RawStreamingChoice, StreamingCompletionResponse},
};

use crate::ai_integration::clients::multi_completion_client::{
    multi_response::MultiResponse, multi_streaming_response::MultiStreamingResponse,
};

type CompletionFn =
    dyn Send + Sync + Fn(CompletionRequest) -> completion::CompletionResponse<MultiResponse>;

type StreamFn = dyn Send
    + Sync
    + Fn(
        CompletionRequest,
    ) -> Result<Option<RawStreamingChoice<MultiStreamingResponse>>, CompletionError>;

#[derive(Clone)]
pub struct MockClient {
    pub model: Option<String>,
    pub completion_fn: Arc<Option<Box<CompletionFn>>>,
    pub stream_fn: Arc<Option<Box<StreamFn>>>,
}

impl CompletionModel for MockClient {
    type Response = MultiResponse;

    type StreamingResponse = MultiStreamingResponse;

    type Client = MockClient;

    fn make(client: &Self::Client, model: impl Into<String>) -> Self {
        let mut new_client = client.clone();
        new_client.model = Some(model.into());
        new_client
    }

    async fn completion(
        &self,
        request: rig::completion::CompletionRequest,
    ) -> Result<CompletionResponse<Self::Response>, CompletionError> {
        match &*self.completion_fn {
            Some(completion_fn) => Ok(completion_fn(request)),
            None => panic!("No completion function provided!"),
        }
    }

    async fn stream(
        &self,
        request: CompletionRequest,
    ) -> Result<StreamingCompletionResponse<Self::StreamingResponse>, CompletionError> {
        if self.stream_fn.is_none() {
            panic!("No streaming function provided!");
        }

        let stream_fn = Arc::clone(&self.stream_fn);

        let stream = stream! {
            loop {
                let response = stream_fn.as_ref().as_ref().unwrap()(request.clone());
                if let Ok(Some(response)) = response {
                    yield Ok(response);
                } else if let Err(err) = response {
                    yield Err(err);
                    break;
                } else {
                    break;
                }
            }
        };

        Ok(StreamingCompletionResponse::stream(Box::pin(stream)))
    }
}
