use std::sync::Arc;

use rig::agent::{HookAction, PromptHook, ToolCallHookAction};

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

    fn cancel_based_on_state(&self) -> HookAction {
        if self.state.generation_cancelled() {
            log::info!("Cancelling the generation of response.");
            HookAction::terminate("Cancelled due to state update.")
        } else {
            HookAction::cont()
        }
    }
}

impl PromptHook<MultiCompletionModel> for StateCancellationHook {
    async fn on_completion_call(
        &self,
        _: &rig::message::Message,
        _: &[rig::message::Message],
    ) -> HookAction {
        self.cancel_based_on_state()
    }

    async fn on_completion_response(
        &self,
        _: &rig::message::Message,
        _: &rig::completion::CompletionResponse<
            <MultiCompletionModel as rig::completion::CompletionModel>::Response,
        >,
    ) -> HookAction {
        self.cancel_based_on_state()
    }

    async fn on_text_delta(&self, _: &str, _: &str) -> HookAction {
        self.cancel_based_on_state()
    }

    async fn on_tool_call_delta(&self, _: &str, _: &str, _: Option<&str>, _: &str) -> HookAction {
        self.cancel_based_on_state()
    }

    async fn on_stream_completion_response_finish(
        &self,
        _: &rig::message::Message,
        _: &<MultiCompletionModel as rig::completion::CompletionModel>::StreamingResponse,
    ) -> HookAction {
        self.cancel_based_on_state()
    }

    async fn on_tool_call(
        &self,
        _: &str,
        _: Option<String>,
        _: &str,
        _: &str,
    ) -> ToolCallHookAction {
        match self.cancel_based_on_state() {
            HookAction::Continue => ToolCallHookAction::Continue,
            HookAction::Terminate { reason } => ToolCallHookAction::terminate(reason),
        }
    }

    async fn on_tool_result(
        &self,
        _: &str,
        _: Option<String>,
        _: &str,
        _: &str,
        _: &str,
    ) -> HookAction {
        self.cancel_based_on_state()
    }
}
