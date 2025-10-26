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
} from "../../../stores/sync/manager/syncEventManager";

interface Props {
	cells: Cell[];
	searchText?: string;
	editCellId: string | null;
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
	editCellId,
	autoFocusEditor,
	className,
	fileMode,
	onError,
	onCellsUpdateSave,
	onEditButtonClick,
}: Props) {
	const [selectedCellId, setSelectedCellId] = useState<string | null>(() => {
		if (cells.some(c => c.id === editCellId)) return editCellId;
		else if (cells.length > 0) return cells[0].id;
		return null;
	});
	const containerRef = useRef<HTMLDivElement>(null);
	const selectedCellRef = useRef<HTMLDivElement>(null);
	const containerScrollTopBeforeSync = useRef(0);
	const cellsPlaceholderHeights = useRef(new Map<string, number>());
	const isSyncing = useAppSelector(selectIsSyncing);
	const enableFileSpecificFunctionality =
		fileMode === "single" && !searchText;

	const { saveChanges, onCellContentUpdate, ignoreCell } = useAutoSave({
		cells,
		onCellsUpdateSave,
		onError,
	});

	useEffect(() => {
		// Scroll to the selected cell when the search text is cleared.
		if (!searchText) selectedCellRef.current?.scrollIntoView();
	}, [searchText]);

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
					selectedCellIndex + (number > 0 ? number + 1 : number),
				);
			});
			await onCellsUpdateSave();
		}
	};

	useGlobalKey(e => {
		if (e.ctrlKey && e.altKey && e.key == "ArrowDown") {
			e.preventDefault();
			void moveSelectedCellByNumber(1);
		} else if (e.ctrlKey && e.altKey && e.key == "ArrowUp") {
			e.preventDefault();
			void moveSelectedCellByNumber(-1);
		} else if (e.ctrlKey && e.key == "ArrowDown") {
			e.preventDefault();
			const selectedCellIndex = cells.findIndex(
				c => c.id === selectedCellId,
			);
			setSelectedCellId(
				cells[Math.min(cells.length - 1, selectedCellIndex + 1)].id,
			);
		} else if (e.ctrlKey && e.key == "ArrowUp") {
			e.preventDefault();
			const selectedCellIndex = cells.findIndex(
				c => c.id === selectedCellId,
			);
			setSelectedCellId(cells[Math.max(0, selectedCellIndex - 1)].id);
		} else if (e.ctrlKey && e.key === " ") {
			selectedCellRef.current?.scrollIntoView();
		}
	}, "keydown");

	const insertNewCell = async (cellType: CellType, index: number) => {
		const cell = createDefaultCell(cellType, fileId!, index);
		const cellId = await executeRequest(async () => await createCell(cell));
		if (cellId) setSelectedCellId(cellId);
		else return;
		await saveChanges();
		await onCellsUpdateSave();
	};

	const handleCellDeleteConfirm = async () => {
		ignoreCell(selectedCellId!);
		const cellIndex = cells.findIndex(c => c.id === selectedCellId);
		await executeRequest(async () => await deleteCell(selectedCellId!));
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
		if (dragCellId === null) return;
		const draggedCellIndex = cells.findIndex(c => c.id === dragCellId);
		if (index === draggedCellIndex) return;
		await executeRequest(async () => await moveCell(dragCellId, index));
		await saveChanges();
		await onCellsUpdateSave();
	};

	const filteredCells = searchText
		? cells.filter(c =>
				c.searchableContent
					.toLowerCase()
					.includes(searchText.toLowerCase()),
			)
		: cells;

	const handleSelect = (
		e: React.FocusEvent<HTMLDivElement>,
		cellId: string,
	) => {
		setSelectedCellId(cellId);
		if (!containerRef.current) return;
		scrollUntilVisible(containerRef.current, e.currentTarget);
	};

	return (
		<div
			className={`${className} ${styles.container} ${isSyncing && styles.syncing}`}
			ref={containerRef}>
			{cells.length === 0 && <p>This file is empty</p>}

			{/* Rerendering when the placeholder height change might be to expensive */}
			{/*eslint-disable-next-line react-hooks/refs */}
			{filteredCells.map((cell, i) => (
				<RenderIfVisible
					key={cell.id}
					defaultHeight={
						cellsPlaceholderHeights.current.get(cell.id) ?? 200
					}
					stayRendered={selectedCellId === cell.id}
					root={containerRef.current}
					onPlaceholderChangeHeight={height =>
						cellsPlaceholderHeights.current.set(cell.id, height)
					}>
					<CellBlock
						key={
							// Using isSyncing directly in key to reforce reconstruction
							// of the editors.
							cell.id + isSyncing
						}
						ref={
							cell.id === selectedCellId ? selectedCellRef : null
						}
						cell={cell}
						fileMode={fileMode}
						onSelect={e => handleSelect(e, cell.id)}
						isSelected={selectedCellId === cell.id}
						onClick={() => setSelectedCellId(cell.id)}
						autoFocusEditor={
							autoFocusEditor && selectedCellId === cell.id
						}
						repetitions={cell.repetitions}
						onError={onError}
						onDrop={e => void handleDrop(e, i)}
						onUpdate={content =>
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
