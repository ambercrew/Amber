import { useCallback, useEffect, useRef } from "react";
import Cell from "../../../types/backend/entity/cell";
import useBeforeUnload from "../../../hooks/useBeforeUnload";
import UpdateCellRequest from "../../../types/backend/dto/updateCellRequest";
import { updateCellsContents } from "../../../api/cellApi";
import errorToString from "../../../utils/errorToString";
import { AUTO_SAVE_DELAY_IN_MILLI_SECONDS } from "../../../config/constants";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";
import { defaultCloseRequestedEventManager } from "../../../managers/closeRequestedEventManager";

const CLOSE_REQUESTED_HANDLER_NAME = "useAutoSave handler";

interface IProps {
	cells: Cell[];
	onCellsUpdateSave: () => Promise<void>;
	onError: (error: string) => void;
}

interface IReturnValue {
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
	onError,
}: IProps): IReturnValue {
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

		if (changedCellsIds.current.size === 0) return;
		try {
			const requests: UpdateCellRequest[] = [];

			for (const id of changedCellsIds.current) {
				const cell = updatedCells.current.find(c => c.id === id);
				if (!cell) continue;
				requests.push({
					id,
					content: cell.content,
				});
			}

			await updateCellsContents(requests);
			changedCellsIds.current.clear();
		} catch (e) {
			console.error(e);
			onError(errorToString(e));
		}
		await onCellsUpdateSave();
	}, [onError, onCellsUpdateSave]);

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
		}, AUTO_SAVE_DELAY_IN_MILLI_SECONDS);
	};

	useEffect(() => {
		updatedCells.current = cells;
		return () => void saveChanges();
	}, [cells, saveChanges]);

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

	useBeforeUnload(e => {
		void saveChanges();
		if (changedCellsIds.current.size > 0) e.preventDefault();
	});

	return {
		saveChanges,
		onCellContentUpdate: handleCellContentUpdate,
		ignoreCell: id => changedCellsIds.current.delete(id),
	};
}

export default useAutoSave;
