import { PluginListener } from "@tauri-apps/api/core";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { useEffect } from "react";

export default function useBackButtonPress(cb: () => void) {
	useEffect(() => {
		let cancelled = false;
		let listener: PluginListener | null = null;

		void (async () => {
			listener = await onBackButtonPress(cb);
			if (cancelled) void listener.unregister(); // unmounted before resolve
		})();

		return () => {
			cancelled = true;
			if (listener) void listener.unregister(); // unmounted after resolve
		};
	}, [cb]);
}
