use std::sync::Arc;

use rig::agent::{
    AgentHook, CompletionCallAction, CompletionCallEvent, CompletionResponseEvent, HookContext,
    ObservationAction, StreamResponseFinish, TextDelta, ToolCall, ToolCallAction, ToolCallDelta,
    ToolResultAction, ToolResultEvent,
};

use crate::ai_integration::ai_state::AiState;

const CANCELLED_REASON: &str = "Cancelled due to state update.";

#[derive(Clone)]
pub struct StateCancellationHook {
    state: Arc<AiState>,
}

impl StateCancellationHook {
    pub fn new(state: Arc<AiState>) -> Self {
        Self { state }
    }

    fn cancelled(&self) -> bool {
        if self.state.generation_cancelled() {
            log::info!("Cancelling the generation of response.");
            true
        } else {
            false
        }
    }
}

impl AgentHook for StateCancellationHook {
    async fn on_completion_call(
        &self,
        _ctx: &HookContext,
        _event: CompletionCallEvent<'_>,
    ) -> CompletionCallAction {
        if self.cancelled() {
            CompletionCallAction::stop(CANCELLED_REASON)
        } else {
            CompletionCallAction::Continue
        }
    }

    async fn on_completion_response(
        &self,
        _ctx: &HookContext,
        _event: CompletionResponseEvent<'_>,
    ) -> ObservationAction {
        if self.cancelled() {
            ObservationAction::stop(CANCELLED_REASON)
        } else {
            ObservationAction::Continue
        }
    }

    async fn on_text_delta(&self, _ctx: &HookContext, _event: TextDelta<'_>) -> ObservationAction {
        if self.cancelled() {
            ObservationAction::stop(CANCELLED_REASON)
        } else {
            ObservationAction::Continue
        }
    }

    async fn on_tool_call_delta(
        &self,
        _ctx: &HookContext,
        _event: ToolCallDelta<'_>,
    ) -> ObservationAction {
        if self.cancelled() {
            ObservationAction::stop(CANCELLED_REASON)
        } else {
            ObservationAction::Continue
        }
    }

    async fn on_stream_response_finish(
        &self,
        _ctx: &HookContext,
        _event: StreamResponseFinish<'_>,
    ) -> ObservationAction {
        if self.cancelled() {
            ObservationAction::stop(CANCELLED_REASON)
        } else {
            ObservationAction::Continue
        }
    }

    async fn on_tool_call(&self, _ctx: &HookContext, _event: ToolCall<'_>) -> ToolCallAction {
        if self.cancelled() {
            ToolCallAction::stop(CANCELLED_REASON)
        } else {
            ToolCallAction::Run
        }
    }

    async fn on_tool_result(
        &self,
        _ctx: &HookContext,
        _event: ToolResultEvent<'_>,
    ) -> ToolResultAction {
        if self.cancelled() {
            ToolResultAction::stop(CANCELLED_REASON)
        } else {
            ToolResultAction::Keep
        }
    }
}
