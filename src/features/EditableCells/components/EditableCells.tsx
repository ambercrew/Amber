import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
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
import useAppDispatch from "../../../hooks/useAppDispatch";
import { selectIsSyncing } from "../../../stores/sync/syncSelector";
import { setFocusedCellId } from "../../../stores/ai/aiReducer";
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
import { TOOL_CALL_ACCEPTED_EVENT } from "../../../types/events/toolCallAcceptedEvent";
import {
	CELL_MOVED_TO_FILE,
	CellMovedToFilePayload,
} from "../../../types/events/cellMovedToFileEvent";

/** Used to say how many cells are always eagerly loaded from the current
 * selected cell.
 */
const EAGER_LOAD_DISTANCE_FROM_SELECTED = 3;

export interface EditableCellsHandle {
	saveChanges: () => Promise<void>;
}

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

const EditableCells = forwardRef<EditableCellsHandle, Props>(
	function EditableCells(
		{
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
		}: Props,
		ref,
	) {
		const [selectedCellId, setSelectedCellId] = useState<string | null>(
			null,
		);
		/** Automatically scroll to the selected cell on the next render,
		 * this requires something else to re-render the component for it to work.
		 */
		const scrollToSelectedCellOnNextRender = useRef<boolean>(true);
		const containerRef = useRef<HTMLDivElement>(null);
		const previousSearchText = useRef(searchText);
		const selectedCellRef = useRef<HTMLDivElement>(null);
		const containerScrollTopBeforeSync = useRef(0);
		const isSyncing = useAppSelector(selectIsSyncing);
		const dispatch = useAppDispatch();
		const enableFileSpecificFunctionality =
			fileMode === "single" && !searchText;
		const [toolCallRevision, setToolCallRevision] = useState(0);

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

		useImperativeHandle(ref, () => ({ saveChanges }), [saveChanges]);

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
				scrollUntilVisible(
					containerRef.current,
					selectedCellRef.current,
				);
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

		useEffect(() => {
			dispatch(setFocusedCellId(selectedCellId));

			return () => {
				dispatch(setFocusedCellId(null));
			};
		}, [dispatch, selectedCellId]);

		useEffect(() => {
			const cb = () => {
				void (async () => {
					await saveChanges();
					setToolCallRevision(v => v + 1);
				})();
			};

			window.addEventListener(TOOL_CALL_ACCEPTED_EVENT, cb);
			return () =>
				window.removeEventListener(TOOL_CALL_ACCEPTED_EVENT, cb);
		}, [saveChanges]);

		const moveSelectedCellByNumber = async (number: number) => {
			if (!enableFileSpecificFunctionality) return;

			const selectedCellIndex = cells.findIndex(
				c => c.id === selectedCellId,
			);
			if (
				selectedCellIndex + number >= 0 &&
				selectedCellIndex + number < cells.length
			) {
				await saveChanges();
				await callApi(async () => {
					await moveCell(
						selectedCellId!,
						cells[selectedCellIndex + number].index,
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
						Math.min(
							filteredCells.length - 1,
							selectedCellIndex + 1,
						)
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
			await saveChanges();
			scrollToSelectedCellOnNextRender.current = true;
			setSelectedCellId(cellId);
		};

		const selectPreviousCell = useCallback(() => {
			scrollToSelectedCellOnNextRender.current = true;
			const currentIndex = cells.findIndex(c => c.id === selectedCellId);
			const newSelectedId =
				currentIndex > 0 ? cells[currentIndex - 1].id : null;
			if (newSelectedId) setSelectedCellId(newSelectedId);
		}, [cells, selectedCellId]);

		useEffect(() => {
			const cb = (e: CustomEvent<CellMovedToFilePayload>) => {
				const { cellId } = e.detail;
				if (cellId !== selectedCellId) return;
				selectPreviousCell();
			};
			window.addEventListener(CELL_MOVED_TO_FILE, cb);
			return () => window.removeEventListener(CELL_MOVED_TO_FILE, cb);
		}, [selectedCellId, selectPreviousCell]);

		const handleCellDeleteConfirm = async () => {
			ignoreCell(selectedCellId!);
			await callApi(async () => await deleteCell(selectedCellId!));
			await saveChanges();
			selectPreviousCell();
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

				const draggedCellIndex = cells.findIndex(
					c => c.id === dragCellId,
				);
				let dropIndex =
					targetData.type === "add-cell-container"
						? cells[cells.length - 1].index + 1
						: cells.find(c => c.id === targetData.cellId)!.index;

				if (dropIndex > draggedCellIndex) dropIndex--;

				void (async () => {
					await callApi(
						async () => await moveCell(dragCellId, dropIndex),
					);
					scrollToSelectedCellOnNextRender.current = true;
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
								// Using isSyncing and toolCallRevision to force reconstruction
								// of the editors when external content changes occur.
								i + cell.id + isSyncing + toolCallRevision
							}
							ref={
								cell.id === selectedCellId
									? selectedCellRef
									: null
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
							onChange={content => {
								onCellContentUpdate(cell.id, content);
								scrollToCurrentCell();
							}}
							onDelete={() => void handleCellDeleteConfirm()}
							onInsertNewCell={cellType =>
								void insertNewCell(cellType, cell.index + 1)
							}
							onResetRepetitions={() => void saveChanges()}
							onEditButtonClick={onEditButtonClick}
						/>
					</RenderIfVisible>
				))}

				{enableFileSpecificFunctionality && (
					<AddCellContainer
						onAddNewCell={cellType =>
							void insertNewCell(
								cellType,
								cells.length === 0
									? 0
									: cells[cells.length - 1].index + 1,
							)
						}
					/>
				)}
			</div>
		);
	},
);

export default EditableCells;
