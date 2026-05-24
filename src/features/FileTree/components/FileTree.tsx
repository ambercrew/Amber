import styles from "./styles.module.css";
import FileTreeItem from "./FileTreeItem.tsx";
import UiFolder from "../../../types/ui/uiFolder.ts";
import useAppDispatch from "../../../hooks/useAppDispatch.ts";
import {
	moveCellToFile,
	moveFile,
	moveFolder,
} from "../../../stores/fileSystem/fileSystemActions.ts";
import DraggedFileItemData, {
	DRAGGED_FILE_ITEM_TYPE,
} from "../types/draggedFileItemData.ts";
import FileItemDropContainerData, {
	FILE_ITEM_DROP_CONTAINER_TYPE,
} from "../types/fileItemDropContainerData.ts";
import DraggedCellData, {
	DRAGGED_CELL_TYPE,
} from "../../EditableCells/types/draggedCellData.ts";
import { useDragDropMonitor } from "@dnd-kit/react";

interface Props {
	folder: UiFolder;
	className?: string;
}

function FileTree({ folder, className }: Props) {
	const dispatch = useAppDispatch();

	useDragDropMonitor({
		onDragEnd(event) {
			if (
				event.canceled ||
				event.operation.target?.type !== FILE_ITEM_DROP_CONTAINER_TYPE
			)
				return;

			const { itemId, isFolder: targetIsFolder } = event.operation.target
				.data as FileItemDropContainerData;

			if (event.operation.source?.type === DRAGGED_FILE_ITEM_TYPE) {
				const { id, isFolder } = event.operation.source
					.data as DraggedFileItemData;

				if (!targetIsFolder || id === itemId) return;

				if (isFolder) {
					void dispatch(moveFolder(id, itemId));
				} else {
					void dispatch(moveFile(id, itemId));
				}
			} else if (
				!targetIsFolder &&
				event.operation.source?.type === DRAGGED_CELL_TYPE
			) {
				const { cellId } = event.operation.source
					.data as DraggedCellData;

				void dispatch(moveCellToFile(cellId, itemId));
			}
		},
	});

	return (
		<div className={`${styles.fileTreeContainer} ${className}`}>
			<FileTreeItem
				fullPath=""
				folder={folder}
				id={folder.id}
				depth={0}
			/>
		</div>
	);
}

export default FileTree;
