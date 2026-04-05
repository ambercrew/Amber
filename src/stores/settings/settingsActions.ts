import { getSettings, updateSettings } from "../../api/settingsApi";
import { AppDispatch } from "../store";
import { setSettings } from "./settingsReducer";
import Settings from "../../types/backend/model/settings";
import { sync } from "../sync/syncActions";
import { defaultCloseRequestedEventManager } from "../../managers/closeRequestedEventManager";
import { tryGetCurrentWebView, isMobile } from "../../utils/tauriUtils";

export const SETTINGS_CLOSE_REQUESTED_HANDLER_NAME = "Settings handler";

/** This function should be called on startup, and it loads the settings and
 * applies them.
 */
export function initialLoadAndApplySettings() {
	return async function (dispatch: AppDispatch) {
		const settings = await getSettings();
		dispatch(setSettings(settings));
		await applySettings(settings, dispatch);
		return settings;
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
			await tryGetCurrentWebView()?.window.setTheme(null);
		}

		if (
			settings.theme === "Dark" ||
			(settings.theme === "FollowSystem" &&
				window.matchMedia &&
				window.matchMedia("(prefers-color-scheme: dark)").matches)
		) {
			await tryGetCurrentWebView()?.window.setTheme("dark");
			document.body.classList.add("dark");
		} else {
			await tryGetCurrentWebView()?.window.setTheme("light");
			document.body.classList.remove("dark");
		}

		if (isMobile()) {
			document.body.classList.add("mobile");
		} else {
			document.body.classList.remove("mobile");
		}

		await tryGetCurrentWebView()?.setZoom(settings.zoomPercentage / 100);

		// Adding the event to the close manager is done here,
		// however sync on start is done on app start.
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
