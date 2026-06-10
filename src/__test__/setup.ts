/* eslint-disable @typescript-eslint/no-empty-function */
import "@testing-library/jest-dom";

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
