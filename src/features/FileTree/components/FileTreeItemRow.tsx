import Icon from "@mdi/react";
import styles from "./styles.module.css";
import {
	mdiDotsHorizontal,
	mdiFileDocumentOutline,
	mdiFileTree,
	mdiFolderOpenOutline,
	mdiFolderOutline,
} from "@mdi/js";
import ActionsMenu from "./ActionsMenu";
import { Action } from "../types/action";
import getFileName from "../utils/getFileName";
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import {
	renameFile,
	renameFolder,
} from "../../../stores/fileSystem/fileSystemActions";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { useSearchParams } from "react-router";
import { FILE_ID_QUERY_PARAMETER } from "../../../config/constants";
import CancellableInput from "../../../components/CancellableInput/CancellableInput";
import useOutsideClick from "../../../hooks/useOutsideClick";
import useOutsideContextMenu from "../../../hooks/useOutsideContextMenu";

interface Props {
	isRoot: boolean;
	id: string;
	isFolder: boolean;
	isRenaming: boolean;
	isExpanded: boolean;
	showActions: boolean;
	actions: Action[];
	fullPath: string;
	ref?: React.Ref<FileTreeItemRowRef>;
	onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
	onRenameEnd: () => void;
	onShowActions: () => void;
	onHideActions: () => void;
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	onRenamingCancel: () => void;
}

export interface FileTreeItemRowRef {
	focus: () => void;
}

export default function FileTreeItemRow({
	isRoot,
	id,
	isFolder,
	isRenaming,
	isExpanded,
	showActions,
	actions,
	fullPath,
	ref,
	onDragStart,
	onRenameEnd,
	onShowActions,
	onClick,
	onHideActions,
	onRenamingCancel,
}: Props) {
	const [newName, setNewName] = useState(getFileName(fullPath));
	const [searchParams] = useSearchParams();
	const selectedFileId = searchParams.get(FILE_ID_QUERY_PARAMETER);
	const dispatch = useAppDispatch();
	const isSelected = selectedFileId === id && !isRoot;
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	useOutsideClick(
		containerRef as React.RefObject<HTMLElement>,
		onHideActions,
	);

	useOutsideContextMenu(
		containerRef as React.RefObject<HTMLElement>,
		onHideActions,
	);

	if (!isRenaming) {
		const fileName = getFileName(fullPath);
		if (fileName !== newName) setNewName(fileName);
	}

	useEffect(() => {
		window.addEventListener("scroll", onHideActions, true);

		return () => {
			document.removeEventListener("scroll", onHideActions, true);
		};
	}, [onHideActions]);

	const handleRenameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (isFolder) await dispatch(renameFolder(id, newName));
		else await dispatch(renameFile(id, newName));

		onRenameEnd();
		buttonRef.current?.focus();
	};

	const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
		if (isRenaming) return;
		e.preventDefault();

		if (showActions) onHideActions();
		else onShowActions();
	};

	useImperativeHandle(
		ref,
		() => ({
			focus() {
				buttonRef.current?.focus();
			},
		}),
		[],
	);

	return (
		<>
			<div
				className={`${styles.fileTreeRow}`}
				draggable={!isRoot && !isRenaming}
				onDragStart={onDragStart}
				onContextMenu={handleContextMenu}
				ref={containerRef}>
				<button
					className={`${styles.fileTreeButton}
                    ${isSelected && !isFolder && !isRenaming ? "primary" : "transparent"}`}
					onClick={onClick}
					ref={buttonRef}>
					<Icon
						path={
							isRoot
								? mdiFileTree
								: isFolder
									? isExpanded
										? mdiFolderOpenOutline
										: mdiFolderOutline
									: mdiFileDocumentOutline
						}
						size={1}
					/>
					{isRenaming && (
						<form onSubmit={e => void handleRenameSubmit(e)}>
							<CancellableInput
								onCancel={() => {
									buttonRef.current?.focus();
									onRenamingCancel();
								}}
								type="text"
								value={newName}
								onChange={e => setNewName(e.target.value)}
								onFocus={e => e.target.select()}
								autoFocus
								className={`${styles.fileTreeRenameInput}`}
							/>
						</form>
					)}
					{!isRenaming && (
						<p>{isRoot ? "Files" : getFileName(fullPath)}</p>
					)}
				</button>

				{!isRenaming && (
					<button
						title="Actions"
						onClick={showActions ? onHideActions : onShowActions}
						className={`${styles.fileTreeDots}
                        ${isSelected ? styles.fileTreeDotsSelected : ""}`}>
						<Icon path={mdiDotsHorizontal} size={1} />
					</button>
				)}
			</div>
			{showActions && (
				<ActionsMenu
					actions={actions}
					fileTreeItemRowContainer={containerRef}
				/>
			)}
		</>
	);
}
