import { useCallback, useEffect, useRef, useState } from "react";
import Cell, { CellType } from "../../../api/cells/entities/cell";
import RenderIfVisible from "../../../components/RenderIfVisible/RenderIfVisible";
import AddCellContainer from "./AddCellContainer";
import styles from "./styles.module.css";
import CellBlock from "./CellBlock";
import createCreateCellRequest from "../utils/createCreateCellRequestDto";
import {
	createCell,
	deleteCell,
	moveCell,
} from "../../../api/cells/api/cellApi";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { isModKey } from "../../../utils/keyboardUtils";
import scrollUntilVisible from "../utils/scrollUntilVisible";
import useAutoSave from "../hooks/useAutoSave";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSyncing } from "../../../stores/sync/syncSelector";
import {
	defaultGlobalSyncEventManager,
	ListenerType,
} from "../../../stores/sync/managers/syncEventManager";
import { useDragDropMonitor } from "@dnd-kit/react";
import DraggedCellData, { DRAGGED_CELL_TYPE } from "../types/draggedCellData";
import CellDropContainerData, {
	CELL_DROP_CONTAINER_TYPE,
} from "../types/cellDropContainerData";
import { CallApiFn } from "../../../hooks/useApi";

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
	callApi: CallApiFn;
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
	callApi,
	onCellsUpdateSave,
	onEditButtonClick,
}: Props) {
	const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
	/** Automatically scroll to the selected cell on the next render,
	 * this requires something else to re-render the component for it to work.
	 */
	const scrollToSelectedCellOnNextRender = useRef<boolean>(true);
	const containerRef = useRef<HTMLDivElement>(null);
	const previousSearchText = useRef(searchText);
	const selectedCellRef = useRef<HTMLDivElement>(null);
	const containerScrollTopBeforeSync = useRef(0);
	const isSyncing = useAppSelector(selectIsSyncing);
	const enableFileSpecificFunctionality =
		fileMode === "single" && !searchText;
	const [lastValidSelectedCellIndex, setLastValidSelectedCellIndex] =
		useState<number | null>(null);

	// Ensuring that a cell is selected at start.
	if (!selectedCellId) {
		if (cells.some(c => c.id === initialSelectedCellId))
			setSelectedCellId(initialSelectedCellId!);
		else if (cells.length > 0) {
			if (fileMode === "single")
				setSelectedCellId(cells[cells.length - 1].id);
			else setSelectedCellId(cells[0].id);
		}
	}

	const { saveChanges, onCellContentUpdate, ignoreCell } = useAutoSave({
		cells,
		onCellsUpdateSave,
		callApi,
	});

	let selectedCellIndex: number | null = cells.findIndex(
		c => c.id === selectedCellId,
	);
	if (selectedCellIndex === -1) selectedCellIndex = null;

	if (selectedCellId !== null && !cells.some(c => c.id === selectedCellId)) {
		if (cells.length === 0) {
			setSelectedCellId(null);
		} else {
			let newSelectedCellIdIndex =
				Math.min(
					lastValidSelectedCellIndex ?? cells.length,
					cells.length,
				) - 1;
			newSelectedCellIdIndex = Math.max(0, newSelectedCellIdIndex);
			setSelectedCellId(cells[newSelectedCellIdIndex].id);
		}
	} else if (
		selectedCellIndex !== null &&
		selectedCellIndex !== lastValidSelectedCellIndex
	) {
		setLastValidSelectedCellIndex(selectedCellIndex);
	}

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
		const cb = () => {
			if (containerRef.current) {
				containerScrollTopBeforeSync.current =
					containerRef.current.scrollTop;
			}

			return Promise.resolve();
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

	const moveSelectedCellByNumber = async (number: number) => {
		if (!enableFileSpecificFunctionality) return;

		const selectedCellIndex = cells.findIndex(c => c.id === selectedCellId);
		if (
			0 <= selectedCellIndex + number &&
			selectedCellIndex + number < cells.length
		) {
			await saveChanges();
			await callApi(async () => {
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
		if (isModKey(e) && e.altKey && e.key === "ArrowDown") {
			e.preventDefault();
			void moveSelectedCellByNumber(1);
		} else if (isModKey(e) && e.altKey && e.key === "ArrowUp") {
			e.preventDefault();
			void moveSelectedCellByNumber(-1);
		} else if (isModKey(e) && e.key === "ArrowDown") {
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
		} else if (isModKey(e) && e.key === "ArrowUp") {
			e.preventDefault();
			if (filteredCells.length === 0) return;
			const selectedCellIndex = filteredCells.findIndex(
				c => c.id === selectedCellId,
			);
			scrollToSelectedCellOnNextRender.current = true;
			setSelectedCellId(
				filteredCells[Math.max(0, selectedCellIndex - 1)].id,
			);
		} else if (isModKey(e) && e.key === " ") {
			scrollToCurrentCell();
		}
	}, "keydown");

	const insertNewCell = async (cellType: CellType, index: number) => {
		const request = createCreateCellRequest(cellType, fileId!, index);
		const cellId = await callApi(async () => await createCell(request));
		if (!cellId) return;
		scrollToSelectedCellOnNextRender.current = true;
		setSelectedCellId(cellId);
		await saveChanges();
	};

	const handleCellDeleteConfirm = async () => {
		ignoreCell(selectedCellId!);
		await callApi(async () => await deleteCell(selectedCellId!));
		scrollToSelectedCellOnNextRender.current = true;
		await saveChanges();
	};

	useDragDropMonitor({
		onDragEnd(event) {
			if (
				event.canceled ||
				event.operation.target?.type !== CELL_DROP_CONTAINER_TYPE ||
				event.operation.source?.type !== DRAGGED_CELL_TYPE
			)
				return;

			const { cellId: dragCellId } = event.operation.source
				.data as DraggedCellData;
			const targetData = event.operation.target
				.data as CellDropContainerData;

			const draggedCellIndex = cells.findIndex(c => c.id === dragCellId);
			let dropIndex =
				targetData.type === "add-cell-container"
					? cells.length
					: cells.findIndex(c => c.id === targetData.cellId);

			if (dropIndex > draggedCellIndex) dropIndex--;
			if (dropIndex === draggedCellIndex) return;
			scrollToSelectedCellOnNextRender.current = true;

			void (async () => {
				await callApi(
					async () => await moveCell(dragCellId, dropIndex),
				);
				await saveChanges();
			})();
		},
	});

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
						callApi={callApi}
						onChange={content =>
							onCellContentUpdate(cell.id, content)
						}
						onDelete={() => void handleCellDeleteConfirm()}
						onInsertNewCell={cellType =>
							void insertNewCell(cellType, i + 1)
						}
						onResetRepetitions={() => void saveChanges()}
						onEditButtonClick={onEditButtonClick}
					/>
				</RenderIfVisible>
			))}

			{enableFileSpecificFunctionality && (
				<AddCellContainer
					onAddNewCell={cellType =>
						void insertNewCell(cellType, cells.length)
					}
				/>
			)}
		</div>
	);
}

export default EditableCells;
