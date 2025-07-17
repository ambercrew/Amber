import { useCallback, useEffect, useRef, useState } from "react";
import Cell, { CellType } from "../../type/backend/entity/cell";
import RenderIfVisible from "../../ui/RenderIfVisible";
import AddCellContainer from "./AddCellContainer";
import styles from "./styles.module.css";
import CellBlock from "./CellBlock";
import Repetition from "../../type/backend/entity/repetition";
import { TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import useBeforeUnload from "../../hooks/useBeforeUnload";
import UpdateCellRequest from "../../type/backend/dto/updateCellRequest";
import createDefaultCell from "../../util/createDefaultCell";
import {
	createCell,
	deleteCell,
	moveCell,
	updateCellsContents,
} from "../../api/cellApi";
import errorToString from "../../util/errorToString";
import useGlobalKey from "../../hooks/useGlobalKey";
import scrollUntilVisible from "../../util/scrollUntilVisible";

const AUTO_SAVE_DELAY_IN_MILLI_SECONDS = 2000;
export const CELL_ID_DRAG_FORMAT = "cell/id";

interface Props {
	cells: Cell[];
	searchText?: string;
	repetitions: Repetition[];
	editCellId: number | null;
	fileId?: number;
	autoFocusEditor?: boolean;
	enableFileSpecificFunctionality?: boolean;
	className?: string;
	onError: (error: string) => void;
	onCellsUpdate: () => Promise<void>;
	onEditButtonClick?: (fileId: number, cellId: number) => void;
}

function EditableCells({
	cells,
	searchText,
	repetitions,
	fileId,
	editCellId,
	autoFocusEditor,
	enableFileSpecificFunctionality = true,
	className,
	onError,
	onCellsUpdate,
	onEditButtonClick,
}: Props) {
	const [selectedCellId, setSelectedCellId] = useState<number | null>(() => {
		if (cells.some(c => c.id === editCellId)) return editCellId;
		else if (cells.length > 0) return cells[0].id!;
		return null;
	});
	const containerRef = useRef<HTMLDivElement>(null);
	const selectedCellRef = useRef<HTMLDivElement>(null);
	// This ref is only used for keeping updated cells that are not yet saved.
	const updatedCells = useRef(cells);
	const autoSaveTimeoutId = useRef<number>(null);
	// Used to store the ids of the changed cells so that we update them all
	// together instead of updating one by one.
	const changedCellsIds = useRef(new Set<number>());

	useEffect(() => {
		if (!searchText) {
			selectedCellRef.current?.scrollIntoView();
		}
	}, [searchText]);

	useGlobalKey(e => {
		if (e.ctrlKey && e.altKey && e.code == "ArrowDown") {
			e.preventDefault();
			void moveSelectedCellByNumber(1);
		} else if (e.ctrlKey && e.altKey && e.code == "ArrowUp") {
			e.preventDefault();
			void moveSelectedCellByNumber(-1);
		} else if (e.ctrlKey && e.code == "ArrowDown") {
			e.preventDefault();
			const selectedCellIndex = cells.findIndex(
				c => c.id === selectedCellId,
			);
			setSelectedCellId(
				cells[Math.min(cells.length - 1, selectedCellIndex + 1)].id!,
			);
		} else if (e.ctrlKey && e.code == "ArrowUp") {
			e.preventDefault();
			const selectedCellIndex = cells.findIndex(
				c => c.id === selectedCellId,
			);
			setSelectedCellId(cells[Math.max(0, selectedCellIndex - 1)].id!);
		} else if (e.ctrlKey && e.key === " ") {
			selectedCellRef.current?.scrollIntoView();
		}
	}, "keydown");

	useBeforeUnload(e => {
		void saveChanges();
		if (changedCellsIds.current.size > 0) e.preventDefault();
	});

	const executeRequest = useCallback(
		async <T,>(cb: () => Promise<T>): Promise<T | null> => {
			try {
				return await cb();
			} catch (e) {
				console.error(e);
				onError(errorToString(e));
			}
			return null;
		},
		[onError],
	);

	const saveChanges = useCallback(async () => {
		if (autoSaveTimeoutId.current !== null) {
			clearTimeout(autoSaveTimeoutId.current);
			autoSaveTimeoutId.current = null;
		}

		if (changedCellsIds.current.size === 0) return;

		await executeRequest(async () => {
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
		});

		await onCellsUpdate();
	}, [executeRequest, onCellsUpdate]);

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

	const insertNewCell = async (cellType: CellType, index: number) => {
		const cell = createDefaultCell(cellType, fileId!, index);
		const cellId = await executeRequest(async () => await createCell(cell));
		if (cellId) setSelectedCellId(cellId);
		else return;
		await saveChanges();
		await onCellsUpdate();
	};

	const handleCellDeleteConfirm = async () => {
		changedCellsIds.current.delete(selectedCellId!);
		const cellIndex = cells.findIndex(c => c.id === selectedCellId);
		await executeRequest(async () => await deleteCell(selectedCellId!));
		if (cellIndex > 0) {
			setSelectedCellId(cellIndex > 0 ? cells[cellIndex - 1].id! : null);
		} else if (cellIndex === 0 && cells.length > 1) {
			setSelectedCellId(cells[1].id!);
		} else {
			setSelectedCellId(null);
		}
		await saveChanges();
		await onCellsUpdate();
	};

	const handleUpdate = (content: string, id: number) => {
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

	const moveSelectedCellByNumber = async (number: number) => {
		if (!enableFileSpecificFunctionality) return;

		const selectedCellIndex = cells.findIndex(c => c.id === selectedCellId);
		if (
			0 <= selectedCellIndex + number &&
			selectedCellIndex + number < cells.length
		) {
			await saveChanges();
			await executeRequest(async () => {
				await moveCell(
					cells[selectedCellIndex].id!,
					selectedCellIndex + (number > 0 ? number + 1 : number),
				);
			});
			await onCellsUpdate();
		}
	};

	const handleDrop = async (e: React.DragEvent, index: number) => {
		const dragCellId = Number(e.dataTransfer.getData(CELL_ID_DRAG_FORMAT));
		if (dragCellId === null) return;
		const draggedCellIndex = cells.findIndex(c => c.id === dragCellId);
		if (index === draggedCellIndex) return;
		await executeRequest(async () => await moveCell(dragCellId, index));
		await saveChanges();
		await onCellsUpdate();
	};

	const filteredCells = searchText
		? cells.filter(c =>
				c.searchableContent.includes(searchText.toLowerCase()),
			)
		: cells;

	const handleSelect = (e: React.FocusEvent, cellId: number) => {
		setSelectedCellId(cellId);
		if (!containerRef.current) return;
		// Using 100 offset to make sure that the whole element is visible.
		scrollUntilVisible(containerRef.current, e.target, 100);
	};

	return (
		<div className={`${className} ${styles.container}`} ref={containerRef}>
			{cells.length === 0 && <p>This file is empty</p>}

			{filteredCells.map((cell, i) => (
				<RenderIfVisible
					key={cell.id}
					defaultHeight={200}
					stayRendered={selectedCellId === cell.id}
					root={containerRef.current}>
					<CellBlock
						key={cell.id}
						ref={
							cell.id === selectedCellId ? selectedCellRef : null
						}
						cell={cell}
						onSelect={e => handleSelect(e, cell.id!)}
						isSelected={selectedCellId === cell.id}
						onClick={() => setSelectedCellId(cell.id!)}
						autoFocusEditor={
							autoFocusEditor && selectedCellId === cell.id
						}
						repetitions={repetitions.filter(
							r => r.cellId === cell.id,
						)}
						onError={onError}
						onDrop={e => void handleDrop(e, i)}
						onUpdate={content => handleUpdate(content, cell.id!)}
						onDelete={() => void handleCellDeleteConfirm()}
						onInsertNewCell={cellType =>
							void insertNewCell(cellType, i + 1)
						}
						onResetRepetitions={() => {
							void saveChanges();
							void onCellsUpdate();
						}}
						enableFileSpecificFunctionality={
							enableFileSpecificFunctionality
						}
						onEditButtonClick={onEditButtonClick}
					/>
				</RenderIfVisible>
			))}

			{enableFileSpecificFunctionality && (
				<AddCellContainer
					onDrop={e => void handleDrop(e, cells.length)}
					onAddNewCell={cellType =>
						void insertNewCell(cellType, cells.length)
					}
				/>
			)}
		</div>
	);
}

export default EditableCells;
