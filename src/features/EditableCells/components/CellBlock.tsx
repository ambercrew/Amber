import styles from "./styles.module.css";
import { ForwardedRef, forwardRef, useRef, useState } from "react";
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
import { CELL_ID_DRAG_FORMAT } from "../config/constants";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSyncing } from "../../../stores/sync/syncSelector";
import { LexicalEditor } from "lexical";

interface Props {
	cell: Cell;
	isSelected: boolean;
	autoFocusEditor?: boolean;
	repetitions: Repetition[];
	enableFileSpecificFunctionality: boolean;
	fileMode: "single" | "global search";
	onSelect: (e: React.FocusEvent<HTMLDivElement>) => void;
	onClick: (id: string) => void;
	onError: (error: string) => void;
	onDrop: (e: React.DragEvent) => void;
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
		onError,
		onSelect,
		onClick,
		onDrop,
		onChange,
		onDelete,
		onInsertNewCell,
		onResetRepetitions,
		onEditButtonClick,
	}: Props,
	ref: ForwardedRef<HTMLDivElement>,
) {
	const [isDragging, setIsDragging] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [showInsertNewCell, setShowInsertNewCell] = useState(false);
	const [previousIsSelected, setPreviousIsSelected] = useState<
		boolean | null
	>(null);
	const isSyncing = useAppSelector(selectIsSyncing);
	const editorRef = useRef<LexicalEditor>(null);

	useGlobalKey(e => {
		if (e.ctrlKey && e.shiftKey && e.key === "Enter") {
			setShowInsertNewCell(!showInsertNewCell);
		} else if (e.ctrlKey && e.key === " ") {
			if (isSelected) editorRef.current?.focus();
		}
	});

	if (previousIsSelected !== isSelected) {
		setPreviousIsSelected(isSelected);
		setShowInsertNewCell(false);
	}

	const handleDragStart = (e: React.DragEvent) => {
		e.stopPropagation();
		e.dataTransfer.setData(CELL_ID_DRAG_FORMAT, cell.id.toString());
		setIsDragging(true);
	};

	const handleDragOver = (e: React.DragEvent) => {
		if (
			isDragging ||
			!e.dataTransfer.types.some(t => t === CELL_ID_DRAG_FORMAT)
		) {
			return;
		}
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDrop = (e: React.DragEvent) => {
		setIsDragOver(false);
		onDrop(e);
	};

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
			ref={ref}
			onFocus={onSelect}
			onClick={handleClick}
			onDragOver={handleDragOver}
			onDragLeave={() => setIsDragOver(false)}
			onDrop={handleDrop}
			className={`${styles.cellBlock}
                ${isSelected ? styles.selectedCell : ""}
                ${isDragOver ? styles.dragOver : ""}
                ${isDragging ? styles.dragging : ""}`}>
			{isSelected && (
				<FocusTools
					onInsertClick={handleFocusToolsInsertNewCellClick}
					onDragStart={e => handleDragStart(e)}
					onDragEnd={() => setIsDragging(false)}
					cell={cell}
					repetitions={repetitions}
					onShowRepetitionsInfo={() => setShowInsertNewCell(false)}
					onResetRepetitions={onResetRepetitions}
					onError={onError}
					onCellDeleteConfirm={onDelete}
					fileMode={fileMode}
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
			/>
		</div>
	);
}

export default forwardRef(CellBlock);
