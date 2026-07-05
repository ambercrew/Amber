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

// jsdom has no layout engine, so IntersectionObserver isn't implemented.
// Report everything as intersecting so components relying on useInViewport
// (e.g. lazy-rendered images) behave as if visible during tests.
class IntersectionObserver {
	constructor(
		private callback: (
			entries: Pick<IntersectionObserverEntry, "isIntersecting">[],
		) => void,
	) {}
	observe(target: Element) {
		this.callback([{ isIntersecting: true } as IntersectionObserverEntry]);
		void target;
	}
	unobserve() {}
	disconnect() {}
}

window.IntersectionObserver =
	IntersectionObserver as unknown as typeof window.IntersectionObserver;

// Local storage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		clear: () => {
			store = {};
		},
		removeItem: (key: string) => {
			delete store[key];
		},
	};
})();

Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});
