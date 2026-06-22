/* eslint-disable @typescript-eslint/no-empty-function */
import "@testing-library/jest-dom";

// Node.js 22+ defines localStorage as a non-configurable global (unavailable
// without --localstorage-file), which prevents happy-dom from overriding it.
// vi.stubGlobal bypasses the non-configurable restriction.
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
})();
vi.stubGlobal("localStorage", localStorageMock);

vi.mock("@tauri-apps/api/app", () => ({
	onBackButtonPress: vi.fn().mockResolvedValue({ unregister: vi.fn() }),
}));

vi.stubGlobal(
	"ResizeObserver",
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	},
);

vi.stubGlobal("alert", vi.fn());

// KaTeX warns when document.compatMode isn't "CSS1Compat" (quirks mode).
// Happy DOM reports "BackCompat" and inserting a doctype after parsing
// doesn't flip it, so override the getter directly.
Object.defineProperty(document, "compatMode", {
	configurable: true,
	get: () => "CSS1Compat",
});
