/* eslint-disable @typescript-eslint/no-empty-function */
import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("@tauri-apps/api/app", () => ({
	onBackButtonPress: vi.fn().mockResolvedValue({ unregister: vi.fn() }),
}));

// eslint-disable-next-line @typescript-eslint/unbound-method
const { getComputedStyle } = window;
window.getComputedStyle = elt => getComputedStyle(elt);
window.HTMLElement.prototype.scrollIntoView = () => {};

Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

Object.defineProperty(document, "fonts", {
	value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
});

class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

window.ResizeObserver = ResizeObserver;
