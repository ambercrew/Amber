import { getCurrentWindow } from "@tauri-apps/api/window";

interface Handler {
	cb: () => Promise<void>;
	priority: number;
}

export class CloseRequestedEventManager {
	private handlers = new Map<string, Handler>();
	// Used to lazy add a callback to tauri event listener.
	private isEventAdded = false;

	/** Adds a handler that is called before closing the window, handlers
	 * with lower priority are executed before handlers with higher priorities.
	 */
	public addHandler(name: string, handler: Handler) {
		if (!this.isEventAdded) {
			void getCurrentWindow().onCloseRequested(
				this.callHandlers.bind(this),
			);
			this.isEventAdded = true;
		}

		this.handlers.set(name, handler);
	}

	public removeHandler(name: string) {
		this.handlers.delete(name);
	}

	private async callHandlers() {
		const handlers = Array.from(this.handlers.values()).sort(
			(a, b) => a.priority - b.priority,
		);
		for (const handler of handlers) {
			await handler.cb();
		}
	}
}

export const defaultCloseRequestedEventManager =
	new CloseRequestedEventManager();
