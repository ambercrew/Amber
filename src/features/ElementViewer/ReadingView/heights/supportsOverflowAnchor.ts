let cached: boolean | null = null;

/**
 * Feature-detects native CSS scroll anchoring (`overflow-anchor`). Chromium
 * and WebKit (Safari 16.4+, so WKWebView on modern macOS) support it, but
 * WebKitGTK — the Linux Tauri webview — does not, so those splits need the
 * manual fallback in `scrollCompensation.ts`. Result is cached: the running
 * engine's support never changes within a session.
 */
export function supportsOverflowAnchor(): boolean {
	cached ??=
		typeof CSS !== "undefined" &&
		typeof CSS.supports === "function" &&
		CSS.supports("overflow-anchor", "auto");
	return cached;
}
