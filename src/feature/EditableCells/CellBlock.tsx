import styles from "./styles.module.css";
import { ForwardedRef, forwardRef, useRef, useState } from "react";
import Cell, {
	CellType,
	cellTypesDisplayNames,
} from "../../type/backend/entity/cell";
import EditorCell from "../EditorCell/EditorCell";
import getCellIcon from "../../util/getCellIcon";
import Icon from "@mdi/react";
import FocusTools from "./FocusTools";
import Repetition from "../../type/backend/entity/repetition";
import NewCellTypeSelector from "./NewCellTypeSelector";
import { Editor as TipTapEditor } from "@tiptap/react";
import useGlobalKey from "../../hooks/useGlobalKey";
import { CELL_ID_DRAG_FORMAT } from "./EditableCells";

interface Props {
	cell: Cell;
	isSelected: boolean;
	autoFocusEditor?: boolean;
	repetitions: Repetition[];
	enableFileSpecificFunctionality: boolean;
	onSelect: (e: React.FocusEvent<HTMLDivElement>) => void;
	onClick: (id: number) => void;
	onError: (error: string) => void;
	onDrop: (e: React.DragEvent) => void;
	onUpdate: (content: string) => void;
	onDelete: () => void;
	onInsertNewCell: (cellType: CellType) => void;
	onResetRepetitions: () => void;
	onEditButtonClick?: (fileId: number, cellId: number) => void;
}

function CellBlock(
	{
		cell,
		isSelected,
		autoFocusEditor,
		repetitions,
		enableFileSpecificFunctionality,
		onError,
		onSelect,
		onClick,
		onDrop,
		onUpdate,
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
	const tipTapEditorRef = useRef<TipTapEditor>(null);

	useGlobalKey(e => {
		if (e.key === "Escape") {
			if (isSelected) tipTapEditorRef.current?.commands.focus();
		} else if (e.ctrlKey && e.shiftKey && e.code === "Enter") {
			setShowInsertNewCell(!showInsertNewCell);
			if (showInsertNewCell) tipTapEditorRef.current?.commands.focus();
		} else if (e.ctrlKey && e.key === " ") {
			if (isSelected) tipTapEditorRef.current?.commands.focus();
		}
	});

	const handleDragStart = (e: React.DragEvent) => {
		e.stopPropagation();
		e.dataTransfer.setData(CELL_ID_DRAG_FORMAT, cell.id!.toString());
		setIsDragging(true);
	};

	const handleDragOver = (e: React.DragEvent) => {
		const dragCellId = Number(e.dataTransfer.getData(CELL_ID_DRAG_FORMAT));
		if (dragCellId === null || cell.id === dragCellId) {
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
		if (showInsertNewCell) tipTapEditorRef.current?.commands.focus();
	};

	const handleClick = () => {
		if (isSelected && tipTapEditorRef.current) {
			tipTapEditorRef.current.commands.focus();
		}
		onClick(cell.id!);
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
					onDeleteDialogHide={() =>
						tipTapEditorRef.current?.commands.focus()
					}
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

			<EditorCell
				cell={cell}
				autofocus={autoFocusEditor ?? false}
				onUpdate={onUpdate}
				onFocus={editor => (tipTapEditorRef.current = editor)}
				editable={isSelected}
			/>
		</div>
	);
}

export default forwardRef(CellBlock);
