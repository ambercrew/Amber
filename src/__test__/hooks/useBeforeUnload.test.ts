import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import useBeforeUnload from "../../hooks/useBeforeUnload";

describe("useBeforeUnload", () => {
	it("Should call the callback function", async () => {
		// Arrange

		const cb = vi.fn();
		renderHook(() => useBeforeUnload(cb));

		// Act

		await act(() => fireEvent(window, new Event("beforeunload")));

		// Assert

		await waitFor(() => {
			expect(cb).toHaveBeenCalled();
		});
	});

	it("Should unregister the event on unmount", async () => {
		// Arrange

		const cb = vi.fn();
		const { unmount } = renderHook(() => useBeforeUnload(cb));
		unmount();

		// Act

		await act(() => fireEvent(window, new Event("beforeunload")));

		// Assert

		await waitFor(() => {
			expect(cb).not.toHaveBeenCalled();
		});
	});
});
