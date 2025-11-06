import { getCurrentWindow } from "@tauri-apps/api/window";

interface IHandler {
	cb: () => Promise<void>;
	priority: number;
}

export class CloseRequestedEventManager {
	private handlers = new Map<string, IHandler>();

	/** Adds a handler that is called before closing the window, handlers
	 * with lower priority are executed before handlers with higher priorities.
	 */
	public addHandler(name: string, handler: IHandler) {
		this.handlers.set(name, handler);
	}

	public removeHandler(name: string) {
		this.handlers.delete(name);
	}

	public async callHandlers() {
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

void getCurrentWindow().onCloseRequested(async () => {
	await defaultCloseRequestedEventManager.callHandlers();
});
