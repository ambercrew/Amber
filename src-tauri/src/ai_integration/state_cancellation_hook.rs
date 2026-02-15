use std::sync::Arc;

use rig::agent::StreamingPromptHook;

use crate::ai_integration::{
    ai_state::AiState,
    clients::multi_completion_client::multi_completion_model::MultiCompletionModel,
};

#[derive(Clone)]
pub struct StateCancellationHook {
    state: Arc<AiState>,
}

impl StateCancellationHook {
    pub fn new(state: Arc<AiState>) -> Self {
        Self { state }
    }

    fn cancel_based_on_state(&self, cancel_sig: rig::agent::CancelSignal) {
        if self.state.generation_cancelled() {
            log::info!("Cancelling generation of AI.");
            cancel_sig.cancel_with_reason("Cancelled due to state update.");
        }
    }
}

impl StreamingPromptHook<MultiCompletionModel> for StateCancellationHook {
    async fn on_completion_call(
        &self,
        _: &rig::message::Message,
        _: &[rig::message::Message],
        cancel_sig: rig::agent::CancelSignal,
    ) {
        self.cancel_based_on_state(cancel_sig);
    }

    async fn on_text_delta(&self, _: &str, _: &str, cancel_sig: rig::agent::CancelSignal) {
        self.cancel_based_on_state(cancel_sig);
    }

    async fn on_tool_call_delta(
        &self,
        _: &str,
        _: Option<&str>,
        _: &str,
        cancel_sig: rig::agent::CancelSignal,
    ) {
        self.cancel_based_on_state(cancel_sig);
    }

    async fn on_stream_completion_response_finish(
        &self,
        _: &rig::message::Message,
        _: &<MultiCompletionModel as rig::completion::CompletionModel>::StreamingResponse,
        cancel_sig: rig::agent::CancelSignal,
    ) {
        self.cancel_based_on_state(cancel_sig);
    }

    async fn on_tool_call(
        &self,
        _: &str,
        _: Option<String>,
        _: &str,
        cancel_sig: rig::agent::CancelSignal,
    ) {
        self.cancel_based_on_state(cancel_sig);
    }

    async fn on_tool_result(
        &self,
        _: &str,
        _: Option<String>,
        _: &str,
        _: &str,
        cancel_sig: rig::agent::CancelSignal,
    ) {
        self.cancel_based_on_state(cancel_sig);
    }
}
