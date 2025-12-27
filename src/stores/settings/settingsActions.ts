import { getSettings, updateSettings } from "../../api/settingsApi";
import { AppDispatch, RootState } from "../store";
import { setSettings } from "./settingsReducer";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import Settings from "../../types/backend/model/settings";
import { sync } from "../sync/syncActions";
import { defaultCloseRequestedEventManager } from "../../managers/closeRequestedEventManager";
import { selectIsSignedIn, selectUserInformation } from "../user/userSelectors";

export const SETTINGS_CLOSE_REQUESTED_HANDLER_NAME = "Settings handler";

/** This function should be called on startup, and it loads the settings and
 * applies them.
 */
export function initialLoadAndApplySettings() {
	return async function (dispatch: AppDispatch, getState: () => RootState) {
		const settings = await getSettings();
		// TODO: update tests
		if (
			settings.autoSync &&
			selectIsSignedIn(getState()) &&
			selectUserInformation(getState())?.isEmailVerified
		) {
			await dispatch(sync());
		}
		dispatch(setSettings(settings));
		await applySettings(settings, dispatch, getState);
	};
}

export function updateAndApplySettings(settings: Settings) {
	return async function (dispatch: AppDispatch, getState: () => RootState) {
		await updateSettings({
			...settings,
		});
		dispatch(setSettings(settings));
		await applySettings(settings, dispatch, getState);
	};
}

async function applySettings(
	settings: Settings,
	dispatch: AppDispatch,
	getState: () => RootState,
) {
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
				if (settings.autoSync && selectIsSignedIn(getState()))
					await dispatch(sync());
			},
			// Must be executed after everything.
			priority: 9999,
		},
	);
}
