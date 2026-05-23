use rig::{
    completion::{self, CompletionError, CompletionModel, CompletionRequest},
    streaming::{self},
};

#[cfg(not(test))]
use rig::{
    message::ToolCall,
    streaming::{
        RawStreamingChoice, RawStreamingToolCall, StreamedAssistantContent,
        StreamingCompletionResponse,
    },
};

#[cfg(not(test))]
use rig::providers::{ollama, openai};
#[cfg(not(test))]
use tokio_stream::StreamExt;

#[cfg(test)]
use crate::ai_integration::clients::mock_client::MockClient;
use crate::ai_integration::clients::multi_client::{
    MultiClient, multi_response::MultiResponse, multi_streaming_response::MultiStreamingResponse,
};

#[derive(Clone)]
pub enum MultiCompletionModel {
    #[cfg(not(test))]
    Ollama(ollama::CompletionModel),
    #[cfg(not(test))]
    OpenAI(openai::CompletionModel),
    #[cfg(test)]
    Mock(MockClient),
}

impl CompletionModel for MultiCompletionModel {
    type Response = MultiResponse;

    type StreamingResponse = MultiStreamingResponse;

    type Client = MultiClient;

    fn make(client: &Self::Client, model: impl Into<String>) -> Self {
        match client {
            #[cfg(not(test))]
            MultiClient::Ollama(client) => {
                MultiCompletionModel::Ollama(ollama::CompletionModel::make(client, model))
            }
            #[cfg(not(test))]
            MultiClient::OpenAI(client) => {
                MultiCompletionModel::OpenAI(openai::CompletionModel::make(client, model))
            }
            #[cfg(test)]
            MultiClient::Mock(client) => {
                MultiCompletionModel::Mock(MockClient::make(client, model))
            }
        }
    }

    async fn completion(
        &self,
        request: rig::completion::CompletionRequest,
    ) -> Result<completion::CompletionResponse<Self::Response>, CompletionError> {
        match self {
            #[cfg(not(test))]
            Self::Ollama(completion_model) => {
                completion_model.completion(request).await.map(|val| {
                    completion::CompletionResponse {
                        choice: val.choice,
                        usage: val.usage,
                        raw_response: val.raw_response.into(),
                        message_id: val.message_id,
                    }
                })
            }
            #[cfg(not(test))]
            Self::OpenAI(completion_model) => {
                completion_model.completion(request).await.map(|val| {
                    completion::CompletionResponse {
                        choice: val.choice,
                        usage: val.usage,
                        raw_response: val.raw_response.into(),
                        message_id: val.message_id,
                    }
                })
            }
            #[cfg(test)]
            MultiCompletionModel::Mock(completion_model) => {
                MockClient::completion(completion_model, request).await
            }
        }
    }

    async fn stream(
        &self,
        request: CompletionRequest,
    ) -> Result<streaming::StreamingCompletionResponse<Self::StreamingResponse>, CompletionError>
    {
        match self {
            #[cfg(not(test))]
            Self::Ollama(completion_model) => {
                let stream = completion_model.stream(request).await?;
                let mapped_stream =
                    Box::pin(stream.map(|result| result.map(to_raw_streaming_choice)));
                Ok(StreamingCompletionResponse::stream(mapped_stream))
            }
            #[cfg(not(test))]
            Self::OpenAI(completion_model) => {
                let stream = completion_model.stream(request).await?;
                let mapped_stream =
                    Box::pin(stream.map(|result| result.map(to_raw_streaming_choice)));
                Ok(StreamingCompletionResponse::stream(mapped_stream))
            }
            #[cfg(test)]
            Self::Mock(completion_model) => completion_model.stream(request).await,
        }
    }
}

#[cfg(not(test))]
fn to_raw_streaming_choice<R>(
    content: StreamedAssistantContent<R>,
) -> RawStreamingChoice<MultiStreamingResponse>
where
    R: Into<MultiStreamingResponse>,
{
    match content {
        StreamedAssistantContent::Text(text) => RawStreamingChoice::Message(text.text),
        StreamedAssistantContent::ReasoningDelta { id, reasoning } => {
            RawStreamingChoice::ReasoningDelta { id, reasoning }
        }
        StreamedAssistantContent::Reasoning(reasoning) => RawStreamingChoice::Reasoning {
            id: reasoning.id,
            content: reasoning.content[0].clone(),
        },
        StreamedAssistantContent::ToolCallDelta {
            id,
            internal_call_id,
            content,
        } => RawStreamingChoice::ToolCallDelta {
            id,
            internal_call_id,
            content,
        },
        StreamedAssistantContent::ToolCall {
            tool_call,
            internal_call_id,
        } => RawStreamingChoice::ToolCall(to_raw_streaming_call(tool_call, internal_call_id)),
        StreamedAssistantContent::Final(response) => {
            RawStreamingChoice::FinalResponse(response.into())
        }
    }
}

#[cfg(not(test))]
fn to_raw_streaming_call(tool_call: ToolCall, internal_call_id: String) -> RawStreamingToolCall {
    RawStreamingToolCall {
        id: tool_call.id,
        call_id: tool_call.call_id,
        name: tool_call.function.name,
        arguments: tool_call.function.arguments,
        signature: tool_call.signature,
        additional_params: tool_call.additional_params,
        internal_call_id,
    }
}
