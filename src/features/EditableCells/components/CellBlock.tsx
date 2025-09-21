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
import { Editor as TipTapEditor } from "@tiptap/react";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { CELL_ID_DRAG_FORMAT } from "../config/constants";

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
	onUpdate: (content: string) => void;
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
		} else if (e.ctrlKey && e.key === " ") {
			if (isSelected) tipTapEditorRef.current?.commands.focus();
		}
	});

	useEffect(() => {
		// Hide show insert new cell when selection change.
		setShowInsertNewCell(false);
	}, [isSelected]);

	const handleDragStart = (e: React.DragEvent) => {
		e.stopPropagation();
		e.dataTransfer.setData(CELL_ID_DRAG_FORMAT, cell.id.toString());
		setIsDragging(true);
	};

	const handleDragOver = (e: React.DragEvent) => {
		const dragCellId = e.dataTransfer.getData(CELL_ID_DRAG_FORMAT);
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
					onDeleteDialogHide={() =>
						tipTapEditorRef.current?.commands.focus()
					}
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
				autofocus={autoFocusEditor ?? false}
				onUpdate={onUpdate}
				onFocus={editor => (tipTapEditorRef.current = editor)}
				editable={isSelected}
			/>
		</div>
	);
}

export default forwardRef(CellBlock);
