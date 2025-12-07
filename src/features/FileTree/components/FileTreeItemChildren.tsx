import { mdiFileDocumentPlusOutline, mdiFolderPlusOutline } from "@mdi/js";
import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { useRef, useState } from "react";
import UiFolder from "../../../types/ui/uiFolder";
import FileTreeItem from "./FileTreeItem";
import useAppDispatch from "../../../hooks/useAppDispatch";
import {
	createFile,
	createFolder,
} from "../../../stores/fileSystem/fileSystemActions";
import CancellableInput from "../../../components/CancellableInput/CancellableInput";
import { FileTreeItemRowRef } from "./FileTreeItemRow";

interface Props {
	creatingNewFolder: boolean;
	creatingNewFile: boolean;
	folder: UiFolder;
	fullPath: string;
	isRoot: boolean;
	isAnyItemDragged: boolean;
	onMarkForDeletion: (id: string, isFolder: boolean) => void;
	onCreatingNewItemEnd: () => void;
	onCreateNewFileClick: () => void;
	onDragStart: () => void;
	onDragEnd: () => void;
}

function FileTreeItemChildren({
	creatingNewFile,
	creatingNewFolder,
	folder,
	fullPath,
	isRoot,
	isAnyItemDragged,
	onMarkForDeletion,
	onCreatingNewItemEnd,
	onCreateNewFileClick,
	onDragStart,
	onDragEnd,
}: Props) {
	// Creating new folder or file share the same controlled input.
	const [newItemName, setNewItemName] = useState("");
	// Contains the id of the child that should be focused automatically.
	const autoFocusChildId = useRef<string | null>(null);
	const dispatch = useAppDispatch();

	const handleCreateNewItemSubmit = async (
		e: React.FormEvent<HTMLFormElement>,
	) => {
		e.preventDefault();
		if (creatingNewFolder) {
			autoFocusChildId.current = await dispatch(
				createFolder(newItemName, folder.id),
			);
		} else if (creatingNewFile) {
			autoFocusChildId.current = await dispatch(
				createFile(newItemName, folder.id),
			);
		}
		setNewItemName("");
		onCreatingNewItemEnd();
	};

	const handleFileTreeItemRowRef = (id: string) => {
		return (ref: FileTreeItemRowRef | null) => {
			if (id === autoFocusChildId.current && ref) {
				ref.focus();
				autoFocusChildId.current = null;
			}
		};
	};

	return (
		<div
			className={`${styles.fileTreeItemChildren} ${isRoot && styles.root}`}>
			{(creatingNewFile || creatingNewFolder) && (
				<form
					className={styles.fileTreeNewItemRow}
					onSubmit={e => void handleCreateNewItemSubmit(e)}>
					<Icon
						path={
							creatingNewFolder
								? mdiFolderPlusOutline
								: mdiFileDocumentPlusOutline
						}
						size={1}
					/>
					<CancellableInput
						type="text"
						value={newItemName}
						onChange={e => setNewItemName(e.target.value)}
						placeholder="Enter the name"
						autoFocus
						onCancel={onCreatingNewItemEnd}
					/>
				</form>
			)}

			{folder.subfolders.length + folder.files.length === 0 &&
				!creatingNewFolder &&
				!creatingNewFile && (
					<p>
						This folder is empty,
						<button onClick={onCreateNewFileClick} className="link">
							&nbsp;create a file
						</button>
					</p>
				)}

			{folder.subfolders.map(subFolder => (
				<FileTreeItem
					key={subFolder.id}
					folder={subFolder}
					onMarkForDeletion={onMarkForDeletion}
					fullPath={
						fullPath
							? fullPath + "/" + subFolder.name
							: subFolder.name
					}
					id={subFolder.id}
					isAnyItemDragged={isAnyItemDragged}
					onDragStart={onDragStart}
					onDragEnd={onDragEnd}
					fileItemRowRef={handleFileTreeItemRowRef(subFolder.id)}
				/>
			))}

			{folder.files.map(
				file =>
					file.isVisible && (
						<FileTreeItem
							key={file.id}
							folder={null}
							onMarkForDeletion={onMarkForDeletion}
							fullPath={
								fullPath
									? fullPath + "/" + file.name
									: file.name
							}
							id={file.id}
							isAnyItemDragged={isAnyItemDragged}
							onDragStart={onDragStart}
							onDragEnd={onDragEnd}
							fileItemRowRef={handleFileTreeItemRowRef(file.id)}
						/>
					),
			)}
		</div>
	);
}

export default FileTreeItemChildren;
