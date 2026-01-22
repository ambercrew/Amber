import { useCallback, useEffect, useRef, useState } from "react";
import Cell, { CellType } from "../../../types/backend/entity/cell";
import RenderIfVisible from "../../../components/RenderIfVisible/RenderIfVisible";
import AddCellContainer from "./AddCellContainer";
import styles from "./styles.module.css";
import CellBlock from "./CellBlock";
import createDefaultCell from "../utils/createDefaultCell";
import { createCell, deleteCell, moveCell } from "../../../api/cellApi";
import errorToString from "../../../utils/errorToString";
import useGlobalKey from "../../../hooks/useGlobalKey";
import scrollUntilVisible from "../utils/scrollUntilVisible";
import { CELL_ID_DRAG_FORMAT } from "../config/constants";
import useAutoSave from "../hooks/useAutoSave";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSyncing } from "../../../stores/sync/syncSelector";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";

/** Used to say how many cells are always eagerly loaded from the current
 * selected cell.
 */
const EAGER_LOAD_DISTANCE_FROM_SELECTED = 3;

interface Props {
	cells: Cell[];
	searchText?: string;
	initialSelectedCellId?: string | null;
	fileId?: string;
	autoFocusEditor?: boolean;
	className?: string;
	/** Indicates whether the editor is showing the cells for a single or multiple files. */
	fileMode: "single" | "global search";
	onError: (error: string) => void;
	/** Used when the changes to cells are applied, this callback should
	 * retrieve the new cells and repetitions.
	 */
	onCellsUpdateSave: () => Promise<void>;
	onEditButtonClick?: (fileId: string, cellId: string) => void;
}

function EditableCells({
	cells,
	searchText,
	fileId,
	initialSelectedCellId,
	autoFocusEditor,
	className,
	fileMode,
	onError,
	onCellsUpdateSave,
	onEditButtonClick,
}: Props) {
	const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
	/** Automatically scroll to the selected cell on the next render,
	 * this requires something else to re-render the component for it to work.
	 */
	const scrollToSelectedCellOnNextRender = useRef<boolean>(
		initialSelectedCellId !== null && initialSelectedCellId !== undefined,
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const previousSearchText = useRef(searchText);
	const selectedCellRef = useRef<HTMLDivElement>(null);
	const containerScrollTopBeforeSync = useRef(0);
	const isSyncing = useAppSelector(selectIsSyncing);
	const enableFileSpecificFunctionality =
		fileMode === "single" && !searchText;

	// Ensuring that a cell is selected at start.
	if (!selectedCellId) {
		if (cells.some(c => c.id === initialSelectedCellId))
			setSelectedCellId(initialSelectedCellId!);
		else if (cells.length > 0) setSelectedCellId(cells[0].id);
	}

	const { saveChanges, onCellContentUpdate, ignoreCell } = useAutoSave({
		cells,
		onCellsUpdateSave,
		onError,
	});

	let selectedCellIndex: number | null = cells.findIndex(
		c => c.id === selectedCellId,
	);
	if (selectedCellIndex === -1) selectedCellIndex = null;

	const scrollToCurrentCell = useCallback(() => {
		if (
			!selectedCellRef.current ||
			!containerRef.current ||
			selectedCellIndex === null
		) {
			return;
		}
		scrollToSelectedCellOnNextRender.current = false;

		if (selectedCellIndex === 0) {
			containerRef.current.scrollTo({
				top: 0,
			});
		} else if (selectedCellIndex === cells.length - 1) {
			containerRef.current.scrollTo({
				top: containerRef.current.scrollHeight,
			});
		} else {
			scrollUntilVisible(containerRef.current, selectedCellRef.current);
		}
	}, [cells.length, selectedCellIndex]);

	useEffect(() => {
		// Scroll to the selected cell when the search text is cleared.
		if (!searchText && searchText !== previousSearchText.current) {
			scrollToCurrentCell();
		}
		previousSearchText.current = searchText;
	}, [searchText, scrollToCurrentCell]);

	useEffect(() => {
		const cb = async () => {
			if (!containerRef.current) return;
			containerScrollTopBeforeSync.current =
				containerRef.current.scrollTop;
			await Promise.resolve();
		};
		defaultGlobalSyncEventManager.addListener(
			ListenerType.PreSyncStart,
			cb,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PreSyncStart,
				cb,
			);
	}, []);

	useEffect(() => {
		const cb = async () => {
			if (!containerRef.current) return;
			containerRef.current.scrollTop =
				containerScrollTopBeforeSync.current;
			await Promise.resolve();
		};
		defaultGlobalSyncEventManager.addListener(
			ListenerType.PostSyncComplete,
			cb,
		);
		return () =>
			defaultGlobalSyncEventManager.removeListener(
				ListenerType.PostSyncComplete,
				cb,
			);
	}, []);

	useEffect(() => {
		if (!scrollToSelectedCellOnNextRender.current) return;
		scrollToCurrentCell();
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
					cells[selectedCellIndex].id,
					selectedCellIndex + number,
				);
			});
			scrollToSelectedCellOnNextRender.current = true;
			await onCellsUpdateSave();
		}
	};

	const filteredCells = searchText
		? cells.filter(c =>
				c.searchableContent
					.toLowerCase()
					.includes(searchText.toLowerCase()),
			)
		: cells;

	useGlobalKey(e => {
		if (e.ctrlKey && e.altKey && e.key === "ArrowDown") {
			e.preventDefault();
			void moveSelectedCellByNumber(1);
		} else if (e.ctrlKey && e.altKey && e.key === "ArrowUp") {
			e.preventDefault();
			void moveSelectedCellByNumber(-1);
		} else if (e.ctrlKey && e.key === "ArrowDown") {
			e.preventDefault();
			if (filteredCells.length === 0) return;
			const selectedCellIndex = filteredCells.findIndex(
				c => c.id === selectedCellId,
			);
			scrollToSelectedCellOnNextRender.current = true;
			setSelectedCellId(
				filteredCells[
					Math.min(filteredCells.length - 1, selectedCellIndex + 1)
				].id,
			);
		} else if (e.ctrlKey && e.key === "ArrowUp") {
			e.preventDefault();
			if (filteredCells.length === 0) return;
			const selectedCellIndex = filteredCells.findIndex(
				c => c.id === selectedCellId,
			);
			scrollToSelectedCellOnNextRender.current = true;
			setSelectedCellId(
				filteredCells[Math.max(0, selectedCellIndex - 1)].id,
			);
		} else if (e.ctrlKey && e.key === " ") {
			scrollToCurrentCell();
		}
	}, "keydown");

	const insertNewCell = async (cellType: CellType, index: number) => {
		const cell = createDefaultCell(cellType, fileId!, index);
		const cellId = await executeRequest(async () => await createCell(cell));
		if (!cellId) return;
		scrollToSelectedCellOnNextRender.current = true;
		setSelectedCellId(cellId);
		await saveChanges();
		await onCellsUpdateSave();
	};

	const handleCellDeleteConfirm = async () => {
		ignoreCell(selectedCellId!);
		const cellIndex = cells.findIndex(c => c.id === selectedCellId);
		await executeRequest(async () => await deleteCell(selectedCellId!));
		scrollToSelectedCellOnNextRender.current = true;
		if (cellIndex > 0) {
			setSelectedCellId(cellIndex > 0 ? cells[cellIndex - 1].id : null);
		} else if (cellIndex === 0 && cells.length > 1) {
			setSelectedCellId(cells[1].id);
		} else {
			setSelectedCellId(null);
		}
		await saveChanges();
		await onCellsUpdateSave();
	};

	const handleDrop = async (e: React.DragEvent, index: number) => {
		const dragCellId = e.dataTransfer.getData(CELL_ID_DRAG_FORMAT);
		if (!dragCellId) return;
		const draggedCellIndex = cells.findIndex(c => c.id === dragCellId);
		if (index > draggedCellIndex) index--;
		if (index === draggedCellIndex) return;
		scrollToSelectedCellOnNextRender.current = true;
		await executeRequest(async () => await moveCell(dragCellId, index));
		await saveChanges();
		await onCellsUpdateSave();
	};

	return (
		<div
			className={`${className} ${styles.container} ${isSyncing && styles.syncing}`}
			data-testid="EditableCells"
			ref={containerRef}>
			{cells.length === 0 && <p>This file is empty</p>}

			{filteredCells.map((cell, i) => (
				<RenderIfVisible
					key={cell.id}
					stayRendered={selectedCellId === cell.id}
					root={containerRef}>
					<CellBlock
						key={
							// Using isSyncing directly in key to re-force reconstruction
							// of the editors.
							i + cell.id + isSyncing
						}
						ref={
							cell.id === selectedCellId ? selectedCellRef : null
						}
						eagerLoadRichTextEditor={
							selectedCellIndex !== null
								? Math.abs(selectedCellIndex - i) <=
									EAGER_LOAD_DISTANCE_FROM_SELECTED
								: false
						}
						cell={cell}
						fileMode={fileMode}
						isSelected={selectedCellId === cell.id}
						repetitions={cell.repetitions}
						autoFocusEditor={
							autoFocusEditor && selectedCellId === cell.id
						}
						enableFileSpecificFunctionality={
							enableFileSpecificFunctionality
						}
						onFocus={() => setSelectedCellId(cell.id)}
						onClick={() => setSelectedCellId(cell.id)}
						onError={onError}
						onDrop={e => void handleDrop(e, i)}
						onChange={content =>
							onCellContentUpdate(cell.id, content)
						}
						onDelete={() => void handleCellDeleteConfirm()}
						onInsertNewCell={cellType =>
							void insertNewCell(cellType, i + 1)
						}
						onResetRepetitions={() => {
							void saveChanges();
							void onCellsUpdateSave();
						}}
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
