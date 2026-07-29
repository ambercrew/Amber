import { PluginListener } from "@tauri-apps/api/core";
import { onBackButtonPress } from "@tauri-apps/api/app";
import { useEffect } from "react";
import { isAndroid } from "../utils/tauriUtils";

export default function useBackButtonPress(cb: () => void, enabled = true) {
	useEffect(() => {
		if (!enabled || !isAndroid()) return;

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
	}, [cb, enabled]);
}
