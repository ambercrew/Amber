import { RootState } from "../stores/store";
import { selectSettings } from "../stores/settings/settingsSelector";

/** Whether the app is currently rendering in dark mode, resolving
 * `FollowSystem` via the OS preference (same logic as `applySettings`). */
export function isCurrentlyDark(state: RootState): boolean {
	const theme = selectSettings(state)?.theme;
	if (theme === "Dark") return true;
	if (theme === "Light") return false;
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}
