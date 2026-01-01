import { getSettings, updateSettings } from "../../api/settingsApi";
import { AppDispatch } from "../store";
import { setSettings } from "./settingsReducer";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import Settings from "../../types/backend/model/settings";
import { sync } from "../sync/syncActions";
import { defaultCloseRequestedEventManager } from "../../managers/closeRequestedEventManager";

export const SETTINGS_CLOSE_REQUESTED_HANDLER_NAME = "Settings handler";

/** This function should be called on startup, and it loads the settings and
 * applies them.
 */
export function initialLoadAndApplySettings() {
	return async function (dispatch: AppDispatch) {
		const settings = await getSettings();
		dispatch(setSettings(settings));
		await applySettings(settings, dispatch);
		if (settings.autoSync) await dispatch(sync());
	};
}

export function updateAndApplySettings(settings: Settings) {
	return async function (dispatch: AppDispatch) {
		await updateSettings({
			...settings,
		});
		dispatch(setSettings(settings));
		await applySettings(settings, dispatch);
	};
}

async function applySettings(settings: Settings, dispatch: AppDispatch) {
	try {
		document.body.classList.add("no-transition");

		if (settings.theme === "FollowSystem") {
			// Making the window follow the operating system so that the next check is correct.
			await getCurrentWebview().window.setTheme(null);
		}

		if (
			settings.theme === "Dark" ||
			(settings.theme === "FollowSystem" &&
				window.matchMedia &&
				window.matchMedia("(prefers-color-scheme: dark)").matches)
		) {
			await getCurrentWebview().window.setTheme("dark");
			document.body.classList.add("dark");
		} else {
			await getCurrentWebview().window.setTheme("light");
			document.body.classList.remove("dark");
		}

		await getCurrentWebview().setZoom(settings.zoomPercentage / 100);
		defaultCloseRequestedEventManager.removeHandler(
			SETTINGS_CLOSE_REQUESTED_HANDLER_NAME,
		);
		defaultCloseRequestedEventManager.addHandler(
			SETTINGS_CLOSE_REQUESTED_HANDLER_NAME,
			{
				cb: async () => {
					if (settings.autoSync) await dispatch(sync());
				},
				// Must be executed after everything.
				priority: 9999,
			},
		);
	} finally {
		document.body.classList.remove("no-transition");
	}
}
