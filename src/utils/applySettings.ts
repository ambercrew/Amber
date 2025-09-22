import { getCurrentWebview } from "@tauri-apps/api/webview";
import Settings from "../types/backend/model/settings";

async function applySettings(settings: Settings) {
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
}

export default applySettings;
