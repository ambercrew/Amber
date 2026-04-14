/* eslint-disable @typescript-eslint/no-empty-function */
import "@testing-library/jest-dom";

vi.stubGlobal(
	"ResizeObserver",
	class {
		observe() {}
		unobserve() {}
		disconnect() {}
	},
);

vi.stubGlobal("alert", vi.fn());
