import { getSettings, updateSettings } from "../../api/settingsApi";
import { AppDispatch } from "../store";
import { setSettings } from "./settingsReducer";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import Settings from "../../types/backend/model/settings";
import { sync } from "../sync/syncActions";
import { defaultCloseRequestedEventManager } from "../../managers/closeRequestedEventManager";

const SETTINGS_CLOSE_REQUESTED_HANDLER_NAME = "Settings handler";

/** This function should be called on startup, and it loads the settings and
 * applies them.
 */
export function initialLoadAndApplySettings(isUserSignedIn: boolean) {
	return async function (dispatch: AppDispatch) {
		const settings = await getSettings();
		await applySettings(settings, dispatch);
		dispatch(setSettings(settings));
		if (isUserSignedIn && settings.autoSync) await dispatch(sync());
	};
}

export function updateAndApplySettings(settings: Settings) {
	return async function (dispatch: AppDispatch) {
		await updateSettings({
			...settings,
		});
		await applySettings(settings, dispatch);
		dispatch(setSettings(settings));
	};
}

async function applySettings(settings: Settings, dispatch: AppDispatch) {
	if (
		settings.theme === "Dark" ||
		(settings.theme === "FollowSystem" &&
			window.matchMedia &&
			window.matchMedia("(prefers-color-scheme: dark)").matches)
	) {
		document.body.classList.add("dark");
	} else {
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
}
