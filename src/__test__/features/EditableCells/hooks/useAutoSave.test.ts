import { fireEvent, renderHook } from "@testing-library/react";
import useAutoSave, {
	CLOSE_REQUESTED_HANDLER_NAME,
} from "../../../../features/EditableCells/hooks/useAutoSave";
import { act } from "react";
import createDefaultCell from "../../../../features/EditableCells/utils/createDefaultCell";
import { defaultCloseRequestedEventManager } from "../../../../managers/closeRequestedEventManager";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../../stores/sync/managers/syncEventManager";
import * as cellApi from "../../../../api/cellApi";

const cellId = "1";

vi.mock(import("../../../../managers/closeRequestedEventManager"));
vi.mock(import("../../../../stores/sync/managers/syncEventManager"));
vi.mock(import("../../../../api/cellApi.ts"));

const renderAutoSave = () => {
	const cell = createDefaultCell("FlashCard", "0", 0);
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

describe("useAutoSave", () => {
	it("Saves automatically after delay", async () => {
		// Arrange

		vi.useFakeTimers();
		const updateCellsContentsSpy = vi.spyOn(cellApi, "updateCellsContents");

		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");
		await vi.runAllTimersAsync();

		// Assert

		expect(onCellsUpdateSaveCb).toHaveBeenCalled();
		expect(updateCellsContentsSpy).toHaveBeenCalled();
		vi.useRealTimers();
		vi.clearAllTimers();
	});

	it("Ignore cells remove cell from being saved", async () => {
		// Arrange

		vi.useFakeTimers();
		const updateCellsContentsSpy = vi.spyOn(cellApi, "updateCellsContents");

		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");
		returnValue.result.current.ignoreCell(cellId);
		await vi.runAllTimersAsync();

		// Assert

		expect(onCellsUpdateSaveCb).not.toHaveBeenCalled();
		expect(updateCellsContentsSpy).not.toHaveBeenCalled();
		vi.useRealTimers();
		vi.clearAllTimers();
	});

	it("Does not save if timeout did not pass", () => {
		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");

		// Assert

		expect(onCellsUpdateSaveCb).not.toHaveBeenCalled();
	});

	it("Stops and saves before unload", async () => {
		// Arrange

		const event = new Event("beforeunload");
		const preventDefaultSpy = vi.spyOn(event, "preventDefault");
		const updateCellsContentsSpy = vi.spyOn(cellApi, "updateCellsContents");

		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");
		await act(() => fireEvent(window, event));

		// Assert

		expect(preventDefaultSpy).toHaveBeenCalled();
		expect(updateCellsContentsSpy).toHaveBeenCalled();
		expect(onCellsUpdateSaveCb).toHaveBeenCalled();
	});

	it("Saves on window close request", async () => {
		// Arrange

		const addHandlerSpy = vi.spyOn(
			defaultCloseRequestedEventManager,
			"addHandler",
		);
		const updateCellsContentsSpy = vi.spyOn(cellApi, "updateCellsContents");

		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");

		// Assert

		expect(addHandlerSpy).toHaveBeenCalledWith(
			CLOSE_REQUESTED_HANDLER_NAME,
			expect.objectContaining({
				priority: 0,
			}),
		);
		await (addHandlerSpy.mock.calls[0][1].cb as () => Promise<void>)();
		expect(updateCellsContentsSpy).toHaveBeenCalled();
		expect(onCellsUpdateSaveCb).toHaveBeenCalled();
	});

	it("Saves on unmount", async () => {
		// Arrange

		const updateCellsContentsSpy = vi.spyOn(cellApi, "updateCellsContents");

		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");
		returnValue.unmount();
		// Waiting for async callback to finish.
		await act(async () => {
			/* Nothing */
		});

		// Assert

		expect(updateCellsContentsSpy).toHaveBeenCalled();
		expect(onCellsUpdateSaveCb).toHaveBeenCalled();
	});

	it("Saves on pre-sync start", async () => {
		// Arrange

		const addListenerSpy = vi.spyOn(
			defaultGlobalSyncEventManager,
			"addListener",
		);
		const updateCellsContentsSpy = vi.spyOn(cellApi, "updateCellsContents");

		// Act

		const { returnValue, onCellsUpdateSaveCb } = renderAutoSave();
		returnValue.result.current.onCellContentUpdate(cellId, "test");
		await addListenerSpy.mock.calls.find(
			a => a[0] === ListenerType.PreSyncStart,
		)![1]();

		// Assert

		expect(updateCellsContentsSpy).toHaveBeenCalled();
		expect(onCellsUpdateSaveCb).toHaveBeenCalled();
	});

	it("Calls onCellsUpdateSave on pre-sync complete", async () => {
		// Arrange

		const addListenerSpy = vi.spyOn(
			defaultGlobalSyncEventManager,
			"addListener",
		);

		// Act

		const { onCellsUpdateSaveCb } = renderAutoSave();
		await addListenerSpy.mock.calls.find(
			a => a[0] === ListenerType.PreSyncComplete,
		)![1]();

		// Assert

		expect(onCellsUpdateSaveCb).toHaveBeenCalled();
	});

	it("Unregister useEffect dependencies on unmount", () => {
		// Arrange

		const removeHandlerSpy = vi.spyOn(
			defaultCloseRequestedEventManager,
			"removeHandler",
		);
		const removeListenerSpy = vi.spyOn(
			defaultGlobalSyncEventManager,
			"removeListener",
		);

		// Act

		const { returnValue } = renderAutoSave();
		returnValue.unmount();

		// Assert

		expect(removeHandlerSpy).toHaveBeenCalledWith(
			CLOSE_REQUESTED_HANDLER_NAME,
		);
		expect(removeListenerSpy).toHaveBeenCalledWith(
			ListenerType.PreSyncStart,
			expect.anything(),
		);
		expect(removeListenerSpy).toHaveBeenCalledWith(
			ListenerType.PreSyncComplete,
			expect.anything(),
		);
	});
});
