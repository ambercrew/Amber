import { act, fireEvent, renderHook, waitFor } from "@testing-library/react";
import useBeforeUnload from "../../hooks/useBeforeUnload";

describe(useBeforeUnload, () => {
	it("Calls the callback function", async () => {
		// Arrange

		const cb = vi.fn();
		renderHook(() => useBeforeUnload(cb));

		// Act

		await act(() => fireEvent(window, new Event("beforeunload")));

		// Assert

		await waitFor(() => {
			expect(cb).toBeCalled();
		});
	});
});
