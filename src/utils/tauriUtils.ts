import { Webview, getCurrentWebview } from "@tauri-apps/api/webview";
import { type } from "@tauri-apps/plugin-os";

export function isMobile(): boolean {
	const osType = type();
	return osType === "android" || osType === "ios";
}

export function isAndroid() {
	return type() === "android";
}

export function tryGetCurrentWebView(): Webview | null {
	if (isMobile()) {
		return null;
	}
	return getCurrentWebview();
}
