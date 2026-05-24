import { useCallback, useEffect, useRef } from "react";
import Cell from "../../../api/cells/entities/cell";
import useBeforeUnload from "../../../hooks/useBeforeUnload";
import UpdateCellRequestDto from "../../../api/cells/dto/updateCellRequestDto";
import { updateCellsContents } from "../../../api/cells/api/cellApi";
import { AUTO_SAVE_DELAY_IN_MILLISECONDS } from "../../../config/constants";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";
import { defaultCloseRequestedEventManager } from "../../../managers/closeRequestedEventManager";
import { CallApiFn } from "../../../hooks/useApi";
import { CELL_MOVED_TO_FILE } from "../../../types/events/cellMovedToFileEvent";

export const CLOSE_REQUESTED_HANDLER_NAME = "useAutoSave handler";

interface Props {
	cells: Cell[];
	onCellsUpdateSave: () => Promise<void>;
	callApi: CallApiFn;
}

interface ReturnValue {
	saveChanges: () => Promise<void>;
	onCellContentUpdate: (id: string, content: string) => void;
	ignoreCell: (id: string) => void;
}

/**
 * This hook is used to accumulate which cells got their content updated and
 * then save all the changes in one request. All this happen automatically
 * with a delay.
 */
function useAutoSave({
	cells,
	onCellsUpdateSave,
	callApi,
}: Props): ReturnValue {
	// This ref is only used for keeping updated cells that are not yet saved.
	const updatedCells = useRef(cells);
	const autoSaveTimeoutId = useRef<number>(null);
	// Used to store the ids of the changed cells so that we update them all
	// together instead of updating one by one.
	const changedCellsIds = useRef(new Set<string>());

	const saveChanges = useCallback(async () => {
		if (autoSaveTimeoutId.current !== null) {
			clearTimeout(autoSaveTimeoutId.current);
			autoSaveTimeoutId.current = null;
		}

		await callApi(async () => {
			const requests: UpdateCellRequestDto[] = [];

			for (const id of changedCellsIds.current) {
				const cell = updatedCells.current.find(c => c.id === id);
				if (!cell) continue;
				requests.push({
					id,
					content: cell.content,
				});
			}

			changedCellsIds.current.clear();

			if (requests.length > 0) {
				await updateCellsContents(requests);
			}

			await onCellsUpdateSave();
		});
	}, [callApi, onCellsUpdateSave]);

	const handleCellContentUpdate = (id: string, content: string) => {
		changedCellsIds.current.add(id);
		const newCells = [...updatedCells.current];
		newCells.find(c => c.id === id)!.content = content;
		updatedCells.current = newCells;

		if (autoSaveTimeoutId.current !== null) {
			clearTimeout(autoSaveTimeoutId.current);
			autoSaveTimeoutId.current = null;
		}
		autoSaveTimeoutId.current = setTimeout(() => {
			void saveChanges();
		}, AUTO_SAVE_DELAY_IN_MILLISECONDS);
	};

	// Used for saving changes before unmounting.
	useEffect(() => {
		updatedCells.current = cells;
		return () => void saveChanges();
	}, [cells, saveChanges]);

	// Used for saving changes before closing the app.
	useEffect(() => {
		defaultCloseRequestedEventManager.addHandler(
			CLOSE_REQUESTED_HANDLER_NAME,
			{
				cb: saveChanges,
				// Must be executed at start!
				priority: 0,
			},
		);
		return () =>
			defaultCloseRequestedEventManager.removeHandler(
				CLOSE_REQUESTED_HANDLER_NAME,
			);
	}, [saveChanges]);

	// Used to save changes before syncing.
	useEffect(() => {
		defaultGlobalSyncEventManager.addListener(
			ListenerType.PreSyncStart,
			saveChanges,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PreSyncStart,
				saveChanges,
			);
	}, [saveChanges]);

	// Used to get latest cells after sync.
	useEffect(() => {
		defaultGlobalSyncEventManager.addListener(
			ListenerType.PreSyncComplete,
			onCellsUpdateSave,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PreSyncComplete,
				onCellsUpdateSave,
			);
	}, [onCellsUpdateSave]);

	// Used to save changes before unloading.
	useBeforeUnload(e => {
		if (changedCellsIds.current.size > 0) e.preventDefault();
		void saveChanges();
	});

	// Used to save changes after moving a cell and re-fetching cells.
	useEffect(() => {
		const cb = () => {
			void saveChanges();
		};

		window.addEventListener(CELL_MOVED_TO_FILE, cb);

		return () => window.removeEventListener(CELL_MOVED_TO_FILE, cb);
	}, [saveChanges]);

	return {
		saveChanges,
		onCellContentUpdate: handleCellContentUpdate,
		ignoreCell: id => changedCellsIds.current.delete(id),
	};
}

export default useAutoSave;
