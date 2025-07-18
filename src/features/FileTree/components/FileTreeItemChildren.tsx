import { mdiFileDocumentPlusOutline, mdiFolderPlusOutline } from "@mdi/js";
import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { useState } from "react";
import UiFolder from "../../../types/ui/uiFolder";
import FileTreeItem from "./FileTreeItem";
import useAppDispatch from "../../../hooks/useAppDispatch";
import {
	createFile,
	createFolder,
} from "../../../stores/actions/fileSystemActions";

interface Props {
	creatingNewFolder: boolean;
	creatingNewFile: boolean;
	folder: UiFolder;
	fullPath: string;
	isRoot: boolean;
	isAnyItemDragged: boolean;
	onMarkForDeletion: (id: number, isFolder: boolean) => void;
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
	const dispatch = useAppDispatch();

	const handleCreateNewItemSubmit = async (
		e: React.FormEvent<HTMLFormElement>,
	) => {
		e.preventDefault();
		const newItemPath = isRoot ? newItemName : fullPath + "/" + newItemName;
		if (creatingNewFolder) {
			await dispatch(createFolder(newItemPath));
		} else if (creatingNewFile) {
			await dispatch(createFile(newItemPath));
		}
		setNewItemName("");
		onCreatingNewItemEnd();
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
					<input
						type="text"
						value={newItemName}
						onChange={e => setNewItemName(e.target.value)}
						placeholder="Enter the name"
						autoFocus
						onBlur={onCreatingNewItemEnd}
					/>
				</form>
			)}

			{folder.subFolders.length + folder.files.length === 0 &&
				!creatingNewFolder &&
				!creatingNewFile && (
					<p>
						This folder is empty,
						<button onClick={onCreateNewFileClick} className="link">
							&nbsp;create a file
						</button>
					</p>
				)}

			{folder.subFolders.map(subFolder => (
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
						/>
					),
			)}
		</div>
	);
}

export default FileTreeItemChildren;
