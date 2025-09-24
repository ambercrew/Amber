import {
	save as openSaveDialog,
	open as openOpenDialog,
} from "@tauri-apps/plugin-dialog";
import styles from "./styles.module.css";
import {
	mdiDeleteOutline,
	mdiExport,
	mdiFileDocumentPlusOutline,
	mdiFolderPlusOutline,
	mdiImport,
	mdiPencilOutline,
} from "@mdi/js";
import React, { useRef, useState } from "react";
import { Action } from "../types/action.ts";
import useAppDispatch from "../../../hooks/useAppDispatch.ts";
import {
	getReviewTreeFolderForRoot,
	moveFile,
	moveFolder,
} from "../../../stores/fileSystem/fileSystemActions.ts";
import getFileName from "../utils/getFileName.ts";
import {
	requestFailure,
	setSuccessMessage,
} from "../../../stores/fileSystem/fileSystemReducers.ts";
import UiFolder from "../../../types/ui/uiFolder.ts";
import FileTreeItemRow from "./FileTreeItemRow";
import FileTreeItemChildren from "./FileTreeItemChildren";
import errorToString from "../../../utils/errorToString";
import {
	fileIdQueryParameter,
	ROOT_FOLDER_ID,
} from "../../../config/constants";
import { useNavigate, useSearchParams } from "react-router";
import {
	dragFormatForFile,
	dragFormatForFolder,
	jsonFileFilter,
} from "../config/constants.ts";
import {
	exportFile,
	exportFolder,
	importExportedItem,
} from "../../../api/exportImportApi.ts";
import useLocalStorage from "../../../hooks/useLocalStorage.ts";

interface Props {
	folder: UiFolder | null;
	fullPath: string;
	id: string;
	isAnyItemDragged: boolean;
	onMarkForDeletion: (id: string, isFolder: boolean) => void;
	onDragStart: () => void;
	onDragEnd: () => void;
}

/**
 * Displays a folder or a file based on whether the folder parameter is given
 * or not.
 */
function FileTreeItem({
	folder,
	fullPath,
	id,
	isAnyItemDragged,
	onMarkForDeletion,
	onDragStart,
	onDragEnd,
}: Props) {
	const isRoot = id === ROOT_FOLDER_ID;
	const [showActions, setShowActions] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [creatingNewFolder, setCreatingNewFolder] = useState(false);
	const [creatingNewFile, setCreatingNewFile] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [isOpen, setIsOpen] = useLocalStorage(
		`is-file-tree-item-open-${id}`,
		false,
	);
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const dragEnterTarget = useRef<EventTarget>(null);
	const isExpanded = isRoot || isOpen;
	const actions: Action[] = [];

	const showCreateNewFileInput = () => {
		setCreatingNewFolder(false);
		setCreatingNewFile(true);
		setIsOpen(true);
		setShowActions(false);
	};

	if (folder) {
		actions.push(
			{
				iconName: mdiFolderPlusOutline,
				text: "New Folder",
				onClick: () => {
					setCreatingNewFolder(true);
					setCreatingNewFile(false);
					setIsOpen(true);
					setShowActions(false);
				},
			},
			{
				iconName: mdiFileDocumentPlusOutline,
				text: "New File",
				onClick: showCreateNewFileInput,
				shortcut: "Ctrl + N",
			},
		);
	}

	if (!isRoot) {
		actions.push(
			{
				iconName: mdiPencilOutline,
				text: "Rename",
				onClick: enableRenaming,
				shortcut: "F2",
			},
			{
				iconName: mdiDeleteOutline,
				text: "Delete",
				onClick: markForDeletion,
				shortcut: "DEL",
			},
		);
	}

	actions.push({
		iconName: mdiExport,
		text: "Export",
		onClick: () => {
			void (async () => {
				setShowActions(false);
				const savePath = await openSaveDialog({
					filters: [jsonFileFilter],
					defaultPath: getFileName(fullPath) + ".json",
				});
				if (!savePath) return;
				try {
					await (folder
						? exportFolder(id, savePath)
						: exportFile(id, savePath));
					dispatch(setSuccessMessage("Item exported!"));
				} catch (e) {
					console.error(e);
					dispatch(requestFailure(errorToString(e)));
				}
			})();
		},
	});

	if (folder) {
		actions.push({
			iconName: mdiImport,
			text: "Import",
			onClick: () => {
				void (async () => {
					try {
						setShowActions(false);
						const openPath = await openOpenDialog({
							filters: [jsonFileFilter],
						});
						if (!openPath) return;
						await importExportedItem(openPath, id);
						await dispatch(getReviewTreeFolderForRoot());
						dispatch(setSuccessMessage("Item imported!"));
					} catch (e) {
						console.error(e);
						dispatch(requestFailure(errorToString(e)));
					}
				})();
			},
		});
	}

	function enableRenaming() {
		if (isRoot) return;
		setShowActions(false);
		setIsRenaming(true);
	}

	function markForDeletion() {
		if (isRoot) return;
		onMarkForDeletion(id, folder !== null);
		setShowActions(false);
	}

	const handleClick = () => {
		if (isRenaming) return;
		setShowActions(false);

		if (folder) {
			if (isRoot) {
				void navigate("/");
			} else {
				setIsOpen(!isOpen);
			}
		} else {
			searchParams.set(fileIdQueryParameter, id.toString());
			void navigate({
				pathname: "editor",
				search: searchParams.toString(),
			});
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		e.stopPropagation();

		if (e.key === "F2") {
			enableRenaming();
		} else if (e.key === "Delete" && !isRenaming) {
			markForDeletion();
		} else if (e.ctrlKey && e.key.toLowerCase() === "n") {
			showCreateNewFileInput();
		} else if (e.key === "Escape") {
			setShowActions(false);
		}
	};

	const handleCreateNewItemEnd = () => {
		setCreatingNewFolder(false);
		setCreatingNewFile(false);
	};

	const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
		e.stopPropagation();
		if (isRenaming) return;
		setShowActions(false);
		const format = folder ? dragFormatForFolder : dragFormatForFile;
		e.dataTransfer.setData(format, id.toString());
		onDragStart();
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		if (
			!folder ||
			(!e.dataTransfer.types.includes(dragFormatForFile) &&
				!e.dataTransfer.types.includes(dragFormatForFolder))
		) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		if (e.target === dragEnterTarget.current && folder)
			setIsDragOver(false);
	};

	const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		if (!folder) return;
		e.stopPropagation();
		setIsDragOver(false);

		const fileId = e.dataTransfer.getData(dragFormatForFile);
		const folderId = e.dataTransfer.getData(dragFormatForFolder);
		if (fileId) {
			await dispatch(moveFile(fileId, id));
		} else if (folderId) {
			await dispatch(moveFolder(folderId, id));
		}
	};

	return (
		(!folder || isRoot || folder.isVisible) && (
			<div
				className={`${styles.fileItemOuterContainer} ${isDragOver && isAnyItemDragged ? styles.dragOver : ""}`}
				onDragEnter={e => (dragEnterTarget.current = e.target)}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={e => void handleDrop(e)}
				onKeyDown={handleKeyDown}>
				<FileTreeItemRow
					isRoot={isRoot}
					id={id}
					isFolder={folder !== null}
					isRenaming={isRenaming}
					showActions={showActions}
					isExpanded={isExpanded}
					actions={actions}
					onDragStart={handleDragStart}
					onRenameEnd={() => setIsRenaming(false)}
					fullPath={fullPath}
					onShowActionsClick={() => setShowActions(!showActions)}
					onClick={handleClick}
					onHideActions={() => setShowActions(false)}
					onStopRenaming={() => setIsRenaming(false)}
					onDragEnd={onDragEnd}
				/>

				{folder && isExpanded && (
					<FileTreeItemChildren
						creatingNewFile={creatingNewFile}
						creatingNewFolder={creatingNewFolder}
						onMarkForDeletion={onMarkForDeletion}
						onCreatingNewItemEnd={handleCreateNewItemEnd}
						isRoot={isRoot}
						isAnyItemDragged={isAnyItemDragged}
						folder={folder}
						fullPath={fullPath}
						onCreateNewFileClick={() => setCreatingNewFile(true)}
						onDragStart={onDragStart}
						onDragEnd={onDragEnd}
					/>
				)}
			</div>
		)
	);
}

export default FileTreeItem;
