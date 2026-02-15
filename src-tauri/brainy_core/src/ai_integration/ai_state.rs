use std::sync::atomic::{AtomicBool, Ordering};

use tokio::sync::{Mutex, MutexGuard};

/// Manages the state and lifecycle of AI model calls.
///
/// This struct ensures that only one AI generation can run at a time and provides
/// a mechanism to cancel ongoing generations. It uses interior mutability to allow
/// cancellation from multiple threads safely.
pub struct AiState {
    /// Ensures only one AI generation runs at a time.
    generation_lock: Mutex<()>,

    /// Atomic flag for canceling the current generation. Set to `false` on start,
    /// checked periodically during execution, and set to `true` to request cancellation.
    cancel_current_call: AtomicBool,
}

impl AiState {
    pub fn cancel_generation(&self) {
        self.cancel_current_call.store(true, Ordering::Relaxed);
    }

    pub(in crate::ai_integration) async fn start_generation(&self) -> MutexGuard<'_, ()> {
        let lock = self.generation_lock.lock().await;
        self.cancel_current_call.store(false, Ordering::Relaxed);
        lock
    }

    pub(in crate::ai_integration) fn generation_cancelled(&self) -> bool {
        self.cancel_current_call.load(Ordering::Relaxed)
    }
}

impl Default for AiState {
    fn default() -> Self {
        Self {
            generation_lock: Mutex::new(()),
            cancel_current_call: AtomicBool::new(false),
        }
    }
}
