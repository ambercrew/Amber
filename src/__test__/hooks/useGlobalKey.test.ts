import { renderHook, waitFor } from "@testing-library/react";
import useGlobalKey from "../../hooks/useGlobalKey";
import userEvent from "@testing-library/user-event";

describe("useGlobalKey", () => {
	it("Should call the callback function", async () => {
		// Arrange

		const cb = vi.fn();
		renderHook(() => useGlobalKey(cb));

		// Act

		await userEvent.keyboard("t");

		// Assert

		await waitFor(() => {
			expect(cb).toBeCalled();
		});
	});

	it("Should unregister the event on unmount", async () => {
		// Arrange

		const cb = vi.fn();
		const { unmount } = renderHook(() => useGlobalKey(cb));
		unmount();

		// Act

		await userEvent.keyboard("t");

		// Assert

		await waitFor(() => {
			expect(cb).not.toBeCalled();
		});
	});
});
