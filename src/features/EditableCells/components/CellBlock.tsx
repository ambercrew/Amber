import styles from "./styles.module.css";
import { ForwardedRef, forwardRef, useRef, useState } from "react";
import Cell, {
	CellType,
	cellTypesDisplayNames,
} from "../../../api/cells/entities/cell";
import EditableCell from "../../EditableCell/components/EditableCell";
import getCellIcon from "../../../utils/getCellIcon";
import { Icon } from "@mdi/react";
import FocusTools from "./FocusTools";
import Repetition from "../../../api/cells/entities/repetition";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { isModKey } from "../../../utils/keyboardUtils";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectIsSyncing } from "../../../stores/sync/syncSelector";
import { LexicalEditor } from "lexical";
import { useDraggable, useDroppable } from "@dnd-kit/react";
import DraggedCellData, { DRAGGED_CELL_TYPE } from "../types/draggedCellData";
import CellDropContainerData, {
	CELL_DROP_CONTAINER_TYPE,
} from "../types/cellDropContainerData";
import mergeRefs from "../../../utils/mergeRefs";
import { Feedback } from "@dnd-kit/dom";
import { CallApiFn } from "../../../hooks/useApi";
import { mdiDrag } from "@mdi/js";

interface Props {
	cell: Cell;
	isSelected: boolean;
	autoFocusEditor?: boolean;
	repetitions: Repetition[];
	enableFileSpecificFunctionality: boolean;
	fileMode: "single" | "global search";
	eagerLoadRichTextEditor: boolean;
	callApi: CallApiFn;
	onFocus: (e: React.FocusEvent<HTMLDivElement>) => void;
	onClick: (id: string) => void;
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
		callApi,
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
		plugins: [
			Feedback.configure({ feedback: "clone", dropAnimation: null }),
		],
	});

	const { ref: setDroppableNodeRef, isDropTarget } = useDroppable({
		id: `droppable-${cell.id}`,
		type: CELL_DROP_CONTAINER_TYPE,
		data: { type: "cell", cellId: cell.id } as CellDropContainerData,
		disabled: isDragging,
	});

	useGlobalKey(
		e => {
			if (isModKey(e) && e.key === " ") {
				if (isSelected) editorRef.current?.focus();
			}
		},
		"keydown",
		true,
	);

	if (previousIsSelected !== isSelected) {
		setPreviousIsSelected(isSelected);
	}

	const handleClick = () => {
		// Without this, moving cursor on mobile does not work!
		if (isSelected && editorRef.current) {
			const root = editorRef.current.getRootElement();
			const editorAlreadyFocused =
				root !== null &&
				(document.activeElement === root ||
					root.contains(document.activeElement));
			if (!editorAlreadyFocused) editorRef.current.focus();
		}
		onClick(cell.id);
	};

	return (
		<div
			ref={
				enableFileSpecificFunctionality
					? // eslint-disable-next-line react-hooks/refs
						mergeRefs(setDragRef, setDroppableNodeRef, ref)
					: // eslint-disable-next-line react-hooks/refs
						mergeRefs(setDroppableNodeRef, ref)
			}
			onFocus={onFocus}
			onClick={handleClick}
			data-testid={`CellBlock-${cell.id}`}
			className={`${styles.cellBlock}
                ${isSelected ? styles.selectedCell : ""}
                ${isDropTarget ? styles.dragOver : ""}
                ${isDragging ? styles.dragging : ""}`}>
			<div className={styles.header}>
				<div className={styles.cellTitle}>
					{enableFileSpecificFunctionality && (
						<button
							ref={setHandleDragRef}
							className={`transparent ${styles.drag}`}>
							<Icon path={mdiDrag} size={1} />
						</button>
					)}

					<Icon
						className={styles.icon}
						path={getCellIcon(cell.cellType)}
						size={1}
					/>
					<span>{cellTypesDisplayNames[cell.cellType]}</span>
				</div>

				{isSelected && (
					<FocusTools
						cell={cell}
						repetitions={repetitions}
						onResetRepetitions={onResetRepetitions}
						callApi={callApi}
						onCellDeleteConfirm={onDelete}
						fileMode={fileMode}
						enableFileSpecificFunctionality={
							enableFileSpecificFunctionality
						}
						onEditButtonClick={onEditButtonClick}
						onInsertNewCell={onInsertNewCell}
					/>
				)}
			</div>

			<div className={styles.mainContent}>
				<EditableCell
					cell={cell}
					autofocus={(autoFocusEditor ?? false) && !isSyncing}
					onChange={onChange}
					onFocus={editor => (editorRef.current = editor)}
					eagerLoadRichTextEditor={eagerLoadRichTextEditor}
				/>
			</div>
		</div>
	);
}

export default forwardRef(CellBlock);
