import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

/** Listens for a backend-emitted Tauri event (fire-and-forget, no response
 * expected) for the lifetime of the calling component. */
export function useTauriEvent<TPayload>(
	event: string,
	handler: (payload: TPayload) => void,
) {
	useEffect(() => {
		const unlisten = listen<TPayload>(event, e => {
			handler(e.payload);
		});

		return () => {
			void unlisten.then(f => f());
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [event]);
}
