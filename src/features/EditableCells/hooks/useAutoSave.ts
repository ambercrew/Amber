import { useCallback, useEffect, useRef } from "react";
import Cell from "../../../types/backend/entity/cell";
import useBeforeUnload from "../../../hooks/useBeforeUnload";
import UpdateCellRequest from "../../../types/backend/dto/updateCellRequest";
import { updateCellsContents } from "../../../api/cellApi";
import errorToString from "../../../utils/errorToString";
import { TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AUTO_SAVE_DELAY_IN_MILLI_SECONDS } from "../../../config/constants";

interface Input {
	cells: Cell[];
	onCellsUpdateSave: () => Promise<void>;
	onError: (error: string) => void;
}

interface ReturnValue {
	saveChanges: () => Promise<void>;
	onCellContentUpdate: (id: number, content: string) => void;
	ignoreCell: (id: number) => void;
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
}: Input): ReturnValue {
	// This ref is only used for keeping updated cells that are not yet saved.
	const updatedCells = useRef(cells);
	const autoSaveTimeoutId = useRef<number>(null);
	// Used to store the ids of the changed cells so that we update them all
	// together instead of updating one by one.
	const changedCellsIds = useRef(new Set<number>());

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
					cellId: id,
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

	const handleCellContentUpdate = (id: number, content: string) => {
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
		let unlisten: UnlistenFn;

		void (async () => {
			unlisten = await getCurrentWindow().listen(
				TauriEvent.WINDOW_CLOSE_REQUESTED,
				() => {
					if (changedCellsIds.current.size > 0) {
						void (async () => {
							await saveChanges();
							await getCurrentWindow().destroy();
						})();
					} else {
						void getCurrentWindow().destroy();
					}
				},
			);
		})();

		return () => {
			if (unlisten) void unlisten();
		};
	}, [saveChanges]);

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
