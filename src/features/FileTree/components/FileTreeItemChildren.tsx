import { mdiFileDocumentPlusOutline, mdiFolderPlusOutline } from "@mdi/js";
import { Icon } from "@mdi/react";
import styles from "./styles.module.css";
import { useRef, useState } from "react";
import UiFolder from "../../../types/ui/uiFolder";
import FileTreeItem, { FileTreeItemRef } from "./FileTreeItem";
import useAppDispatch from "../../../hooks/useAppDispatch";
import {
	createFile,
	createFolder,
} from "../../../stores/fileSystem/fileSystemActions";
import CancellableInput from "../../../components/CancellableInput/CancellableInput";

interface Props {
	creatingNewFolder: boolean;
	creatingNewFile: boolean;
	folder: UiFolder;
	fullPath: string;
	isRoot: boolean;
	depth: number;
	onCreatingNewItemEnd: () => void;
	onCreateNewFileClick: () => void;
	onDelete: () => void;
}

function FileTreeItemChildren({
	creatingNewFile,
	creatingNewFolder,
	folder,
	fullPath,
	isRoot,
	depth,
	onCreatingNewItemEnd,
	onCreateNewFileClick,
	onDelete,
}: Props) {
	// Creating new folder or file share the same controlled input.
	const [newItemName, setNewItemName] = useState("");
	// Contains the id of the child that should be focused automatically.
	const autoFocusChildId = useRef<string | null>(null);
	const dispatch = useAppDispatch();

	const handleCreateNewItemSubmit = async (
		e: React.SubmitEvent<HTMLFormElement>,
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
		return (ref: FileTreeItemRef | null) => {
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
					className={`${styles.fileTreeRow} ${styles.withForm} `}
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
						className={`${styles.fileTreeRowInput}`}
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
					depth={depth}
					fullPath={
						fullPath
							? fullPath + "/" + subFolder.name
							: subFolder.name
					}
					id={subFolder.id}
					ref={handleFileTreeItemRowRef(subFolder.id)}
					onDelete={onDelete}
				/>
			))}

			{folder.files.map(
				file =>
					file.isVisible && (
						<FileTreeItem
							key={file.id}
							folder={null}
							depth={depth}
							fullPath={
								fullPath
									? fullPath + "/" + file.name
									: file.name
							}
							id={file.id}
							ref={handleFileTreeItemRowRef(file.id)}
							onDelete={onDelete}
						/>
					),
			)}
		</div>
	);
}

export default FileTreeItemChildren;
