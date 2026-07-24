let cached: boolean | null = null;

/**
 * Feature-detects native CSS scroll anchoring (`overflow-anchor`). Chromium
 * and WebKit (Safari 16.4+) support it, but WebKitGTK (the Linux Tauri
 * webview) doesn't, and needs a manual fallback instead. Cached, since the
 * running engine's support never changes within a session.
 */
export function supportsOverflowAnchor(): boolean {
	cached ??=
		typeof CSS !== "undefined" &&
		typeof CSS.supports === "function" &&
		CSS.supports("overflow-anchor", "auto");
	return cached;
}
