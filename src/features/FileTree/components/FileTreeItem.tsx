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
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Action } from "../types/action.ts";
import useAppDispatch from "../../../hooks/useAppDispatch.ts";
import {
	deleteFile,
	deleteFolder,
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
	FILE_ID_QUERY_PARAMETER,
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
import ConfirmationDialog from "../../../components/ConfirmationDialog/ConfirmationDialog.tsx";
import getFolderChildById from "../../../utils/getFolderChildById.ts";

interface Props {
	folder: UiFolder | null;
	fullPath: string;
	id: string;
	ref?: React.Ref<FileTreeItemRef>;
	onDelete?: () => void;
}

export interface FileTreeItemRef {
	focus: () => void;
}

/**
 * Displays a folder or a file based on whether the folder parameter is given
 * or not.
 */
function FileTreeItem({ folder, fullPath, id, ref, onDelete }: Props) {
	const isRoot = id === ROOT_FOLDER_ID;
	const [isDeleteDialogShown, setIsDeleteDialogShown] = useState(false);
	const [showActions, setShowActions] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [creatingNewFolder, setCreatingNewFolder] = useState(false);
	const [creatingNewFile, setCreatingNewFile] = useState(false);
	const [dragCounter, setDragCounter] = useState(0);
	const [isOpen, setIsOpen] = useLocalStorage(
		`is-file-tree-item-open-${id}`,
		false,
	);
	const [searchParams] = useSearchParams();
	const previousIsRenaming = useRef<boolean | null>(null);
	const fileTreeItemRowRef = useRef<FileTreeItemRef | null>(null);
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const isExpanded = isRoot || isOpen;
	const actions: Action[] = [];
	const selectedFileId = searchParams.get(FILE_ID_QUERY_PARAMETER);

	const showCreateNewFileInput = () => {
		setCreatingNewFolder(false);
		setCreatingNewFile(true);
		setIsOpen(true);
		setShowActions(false);
	};

	const showCreateNewFolderInput = () => {
		setCreatingNewFolder(true);
		setCreatingNewFile(false);
		setIsOpen(true);
		setShowActions(false);
	};

	if (folder) {
		actions.push(
			{
				iconName: mdiFolderPlusOutline,
				text: "New Folder",
				onClick: showCreateNewFolderInput,
				shortcut: "Ctrl + Shift + N",
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
				onClick: showDeleteDialog,
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

	function showDeleteDialog() {
		if (isRoot) return;
		setIsDeleteDialogShown(true);
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
			searchParams.set(FILE_ID_QUERY_PARAMETER, id.toString());
			void navigate({
				pathname: "editor",
				search: searchParams.toString(),
			});
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		let stopPropagation = true;
		const isFolder = folder !== null;

		if (e.key === "F2") {
			enableRenaming();
		} else if (e.key === "Delete" && !isRenaming) {
			showDeleteDialog();
		} else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "n") {
			stopPropagation = isFolder;
			showCreateNewFolderInput();
		} else if (e.ctrlKey && e.key.toLowerCase() === "n") {
			stopPropagation = isFolder;
			showCreateNewFileInput();
		} else if (e.key === "Escape") {
			setShowActions(false);
		}

		if (stopPropagation) e.stopPropagation();
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
	};

	const isAllowedDrag = (e: React.DragEvent<HTMLDivElement>) => {
		return (
			folder &&
			(e.dataTransfer.types.includes(dragFormatForFile) ||
				e.dataTransfer.types.includes(dragFormatForFolder))
		);
	};

	const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		if (!isAllowedDrag(e)) return;
		e.preventDefault();
		e.stopPropagation();
		setDragCounter(val => val + 1);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		if (!isAllowedDrag(e)) return;
		e.preventDefault();
		e.stopPropagation();
		setDragCounter(val => val - 1);
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		if (isAllowedDrag(e)) e.preventDefault();
	};

	const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
		if (!folder) return;
		e.stopPropagation();
		setDragCounter(0);

		const fileId = e.dataTransfer.getData(dragFormatForFile);
		const folderId = e.dataTransfer.getData(dragFormatForFolder);
		if (fileId) {
			await dispatch(moveFile(fileId, id));
		} else if (folderId) {
			await dispatch(moveFolder(folderId, id));
		}
	};

	const handleDelete = async () => {
		if (folder) {
			await dispatch(deleteFolder(id));
			if (selectedFileId && getFolderChildById(folder, selectedFileId)) {
				await navigate("/home", { replace: true });
			}
		} else {
			await dispatch(deleteFile(id));
			if (selectedFileId === id) {
				await navigate("/home", { replace: true });
			}
		}

		setIsDeleteDialogShown(false);
		if (onDelete) onDelete();
	};

	useImperativeHandle(
		ref,
		() => ({
			focus() {
				fileTreeItemRowRef.current?.focus();
			},
		}),
		[],
	);

	useEffect(() => {
		if (!isRenaming && previousIsRenaming.current) {
			fileTreeItemRowRef.current?.focus();
		}
		previousIsRenaming.current = isRenaming;
	}, [isRenaming]);

	return (
		<>
			{isDeleteDialogShown && (
				<ConfirmationDialog
					text={`Are you sure you want to delete the selected ${
						folder ? "folder" : "file"
					}?`}
					title={`Delete ${folder ? "folder" : "file"}`}
					icon={mdiDeleteOutline}
					onCancel={() => setIsDeleteDialogShown(false)}
					onConfirm={() => void handleDelete()}
				/>
			)}

			{(!folder || isRoot || folder.isVisible) && (
				<div
					className={`${styles.fileItemOuterContainer} ${dragCounter ? styles.dragOver : ""}`}
					onDragEnter={handleDragEnter}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={e => void handleDrop(e)}
					onKeyDown={handleKeyDown}>
					<FileTreeItemRow
						ref={fileTreeItemRowRef}
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
						onShowActions={() => setShowActions(true)}
						onClick={handleClick}
						onHideActions={() => setShowActions(false)}
						onRenamingCancel={() => setIsRenaming(false)}
					/>

					{folder && isExpanded && (
						<FileTreeItemChildren
							creatingNewFile={creatingNewFile}
							creatingNewFolder={creatingNewFolder}
							onCreatingNewItemEnd={handleCreateNewItemEnd}
							isRoot={isRoot}
							folder={folder}
							fullPath={fullPath}
							onCreateNewFileClick={() =>
								setCreatingNewFile(true)
							}
							onDelete={() => fileTreeItemRowRef.current?.focus()}
						/>
					)}
				</div>
			)}
		</>
	);
}

export default FileTreeItem;
