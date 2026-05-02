import styles from "./styles.module.css";
import FileTreeItem from "./FileTreeItem.tsx";
import UiFolder from "../../../types/ui/uiFolder.ts";
import useAppDispatch from "../../../hooks/useAppDispatch.ts";
import {
	moveFile,
	moveFolder,
} from "../../../stores/fileSystem/fileSystemActions.ts";
import DraggedFileItemData, {
	DRAGGED_FILE_ITEM_TYPE,
} from "../types/draggedFileItemData.ts";
import FileItemDropContainerData, {
	FILE_ITEM_DROP_CONTAINER_TYPE,
} from "../types/fileItemDropContainerData.ts";
import DefaultDragDropProvider from "../../../components/DefaultDragDropProvider/DefaultDragDropProvider.tsx";
import { DragDropEventHandlers } from "@dnd-kit/react";

interface Props {
	folder: UiFolder;
	className?: string;
}

function FileTree({ folder, className }: Props) {
	const dispatch = useAppDispatch();

	const handleDragEnd: DragDropEventHandlers["onDragEnd"] = event => {
		if (
			event.canceled ||
			event.operation.target?.type !== FILE_ITEM_DROP_CONTAINER_TYPE ||
			event.operation.source?.type !== DRAGGED_FILE_ITEM_TYPE
		)
			return;

		const { id, isFolder } = event.operation.source
			.data as DraggedFileItemData;
		const { folderId } = event.operation.target
			.data as FileItemDropContainerData;

		if (id === folderId) return;

		if (isFolder) {
			void dispatch(moveFolder(id, folderId));
		} else {
			void dispatch(moveFile(id, folderId));
		}
	};

	return (
		<div className={`${styles.fileTreeContainer} ${className}`}>
			<DefaultDragDropProvider onDragEnd={handleDragEnd}>
				<FileTreeItem
					fullPath=""
					folder={folder}
					id={folder.id}
					depth={0}
				/>
			</DefaultDragDropProvider>
		</div>
	);
}

export default FileTree;
