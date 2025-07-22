import { fireEvent, renderHook, waitFor } from "@testing-library/react";
import useAutoSave from "../../../../features/EditableCells/hooks/useAutoSave";
import { act } from "react";
import createDefaultCell from "../../../../features/EditableCells/utils/createDefaultCell";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TauriEvent } from "@tauri-apps/api/event";

const cellId = 1;

const renderAutoSave = () => {
	const cell = createDefaultCell("FlashCard", 0, 0);
	cell.id = cellId;

	const onCellsUpdateSaveCb = vi.fn();

	const returnValue = renderHook(() =>
		useAutoSave({
			cells: [cell],
			onCellsUpdateSave: onCellsUpdateSaveCb,
			onError: () => {
				/* Empty */
			},
		}),
	);

	return {
		onCellsUpdateSaveCb,
		returnValue,
	};
};

describe(useAutoSave, () => {
    beforeAll(() => {
        // Mocking this to not get errors.
		const getCurrentWindowMock = vi.fn();
		vi.mocked(getCurrentWindow).mockImplementation(getCurrentWindowMock);
		getCurrentWindowMock.mockReturnValue({
            listen: vi.fn(),
		});
    });

	it("Saves automatically after delay", async () => {
		// Arrange

		vi.useFakeTimers();

		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");
		await vi.runAllTimersAsync();

		// Assert

		expect(onCellsUpdateSaveCb).toBeCalled();
		vi.useRealTimers();
		vi.clearAllTimers();
	});

	it("Does not save if delay did not pass", () => {
		// Arrange

		const cb = vi.fn();

		// Act

		const { returnValue } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");

		// Assert

		expect(cb).not.toHaveBeenCalled();
	});

	it("Stops before unload", async () => {
		// Arrange

		const event = new Event("beforeunload");
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");

		// Act

        const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");
		await act(() => fireEvent(window, event));

		// Assert

        expect(preventDefaultSpy).toBeCalled();
		expect(onCellsUpdateSaveCb).toBeCalled();
	});

	it("Saves on window close request", async () => {
		// Arrange

		const unlistenMock = vi.fn();
		const listenMock = vi.fn().mockReturnValue(unlistenMock);
		const destroyMock = vi.fn();

		// Must be mocked since spy does not work:
		// https://vitest.dev/guide/browser/#limitations
		vi.mock("@tauri-apps/api/window", { spy: true });
		const getCurrentWindowMock = vi.fn();
		vi.mocked(getCurrentWindow).mockImplementation(getCurrentWindowMock);
		getCurrentWindowMock.mockReturnValue({
			listen: listenMock,
			destroy: destroyMock,
		});

		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");
		(listenMock.mock.calls[0][1] as () => void)();

		// Waiting for all promises, including the ones in useEffect.
		await Promise.resolve();
        // Ensuring that the call back for useEffect is called.
		returnValue.unmount();

		// Assert

		await waitFor(() => {
			expect(listenMock).toBeCalled();
			expect(listenMock.mock.calls[0][0] as string).toBe(
				TauriEvent.WINDOW_CLOSE_REQUESTED,
			);
			expect(listenMock.mock.calls).toHaveLength(1);
			expect(destroyMock).toBeCalled();
			expect(unlistenMock).toBeCalled();
			expect(onCellsUpdateSaveCb).toBeCalled();
		});
	});
});
