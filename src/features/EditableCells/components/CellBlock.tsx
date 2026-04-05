import styles from "./styles.module.css";
import { ForwardedRef, forwardRef, useEffect, useRef, useState } from "react";
import Cell, {
	CellType,
	cellTypesDisplayNames,
} from "../../../types/backend/entity/cell";
import EditableCell from "../../EditableCell/components/EditableCell";
import getCellIcon from "../../../utils/getCellIcon";
import Icon from "@mdi/react";
import FocusTools from "./FocusTools";
import Repetition from "../../../types/backend/entity/repetition";
import NewCellTypeSelector from "./NewCellTypeSelector";
import useGlobalKey from "../../../hooks/useGlobalKey";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSyncing } from "../../../stores/sync/syncSelector";
import { LexicalEditor } from "lexical";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import DraggedCellData, { DRAGGED_CELL_TYPE } from "../types/draggedCellData";
import CellDropContainerData, {
	CELL_DROP_CONTAINER_TYPE,
} from "../types/cellDropContainerData";
import mergeRefs from "../../../utils/mergeRefs";

interface Props {
	cell: Cell;
	isSelected: boolean;
	autoFocusEditor?: boolean;
	repetitions: Repetition[];
	enableFileSpecificFunctionality: boolean;
	fileMode: "single" | "global search";
	eagerLoadRichTextEditor: boolean;
	onFocus: (e: React.FocusEvent<HTMLDivElement>) => void;
	onClick: (id: string) => void;
	onError: (error: string) => void;
	onChange: (content: string) => void;
	onDelete: () => void;
	onInsertNewCell: (cellType: CellType) => void;
	onResetRepetitions: () => void;
	onEditButtonClick?: (fileId: string, cellId: string) => void;
}

function CellBlock(
	{
		cell,
		isSelected,
		autoFocusEditor,
		repetitions,
		enableFileSpecificFunctionality,
		fileMode,
		eagerLoadRichTextEditor,
		onError,
		onFocus,
		onClick,
		onChange,
		onDelete,
		onInsertNewCell,
		onResetRepetitions,
		onEditButtonClick,
	}: Props,
	ref: ForwardedRef<HTMLDivElement>,
) {
	const [showInsertNewCell, setShowInsertNewCell] = useState(false);
	const [previousIsSelected, setPreviousIsSelected] = useState<
		boolean | null
	>(null);
	const isSyncing = useAppSelector(selectIsSyncing);
	const editorRef = useRef<LexicalEditor>(null);

	const {
		ref: setDragRef,
		handleRef: setHandleDragRef,
		isDragging,
	} = useDraggable({
		id: `draggable-${cell.id}`,
		type: DRAGGED_CELL_TYPE,
		data: { cellId: cell.id } as DraggedCellData,
		feedback: "clone",
	});

	const { ref: setDroppableNodeRef, isDropTarget } = useDroppable({
		id: `droppable-${cell.id}`,
		type: CELL_DROP_CONTAINER_TYPE,
		data: { type: "cell", cellId: cell.id } as CellDropContainerData,
	});

	useGlobalKey(
		e => {
			if (e.ctrlKey && e.shiftKey && e.key === "Enter") {
				if (isSelected) {
					e.stopPropagation();
					setShowInsertNewCell(!showInsertNewCell);
				}
			} else if (e.ctrlKey && e.key === " ") {
				if (isSelected) editorRef.current?.focus();
			}
		},
		"keydown",
		true,
	);

	if (previousIsSelected !== isSelected) {
		setPreviousIsSelected(isSelected);
		setShowInsertNewCell(false);
	}

	useEffect(() => {
		if (!showInsertNewCell && editorRef.current) editorRef.current.focus();
	}, [showInsertNewCell]);

	const handleFocusToolsInsertNewCellClick = () => {
		setShowInsertNewCell(!showInsertNewCell);
		if (showInsertNewCell) editorRef.current?.focus();
	};

	const handleClick = () => {
		if (isSelected && editorRef.current) {
			editorRef.current.focus();
		}
		onClick(cell.id);
	};

	const handleInsertNewCell = (cellType: CellType) => {
		setShowInsertNewCell(false);
		onInsertNewCell(cellType);
	};

	return (
		<div
			ref={mergeRefs(setDragRef, setDroppableNodeRef, ref)}
			onFocus={onFocus}
			onClick={handleClick}
			data-testid={`CellBlock-${cell.id}`}
			className={`${styles.cellBlock}
                ${isSelected ? styles.selectedCell : ""}
                ${isDropTarget ? styles.dragOver : ""}
                ${isDragging ? styles.dragging : ""}`}>
			{isSelected && (
				<FocusTools
					onInsertClick={handleFocusToolsInsertNewCellClick}
					cell={cell}
					repetitions={repetitions}
					onShowRepetitionsInfo={() => setShowInsertNewCell(false)}
					onResetRepetitions={onResetRepetitions}
					onError={onError}
					onCellDeleteConfirm={onDelete}
					fileMode={fileMode}
					setHandleDragRef={setHandleDragRef}
					enableFileSpecificFunctionality={
						enableFileSpecificFunctionality
					}
					onEditButtonClick={onEditButtonClick}
				/>
			)}

			{showInsertNewCell &&
				enableFileSpecificFunctionality &&
				isSelected && (
					<NewCellTypeSelector
						className={styles.insertCellPopup}
						onClick={handleInsertNewCell}
						onHide={() => setShowInsertNewCell(false)}
					/>
				)}

			<div className={styles.cellTitle}>
				<Icon path={getCellIcon(cell.cellType)} size={1} />
				<span>{cellTypesDisplayNames[cell.cellType]}</span>
			</div>

			<EditableCell
				cell={cell}
				autofocus={(autoFocusEditor ?? false) && !isSyncing}
				onChange={onChange}
				onFocus={editor => (editorRef.current = editor)}
				eagerLoadRichTextEditor={eagerLoadRichTextEditor}
			/>
		</div>
	);
}

export default forwardRef(CellBlock);
