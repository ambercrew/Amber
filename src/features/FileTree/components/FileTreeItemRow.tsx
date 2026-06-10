import { Icon } from "@mdi/react";
import styles from "./styles.module.css";
import { mdiDotsHorizontal } from "@mdi/js";
import getFileTreeIconPath from "../utils/getFileTreeIconPath";
import ActionsMenu, {
	Action,
} from "../../../components/ActionsMenu/ActionsMenu";
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
import { FileTreeItemRef } from "./FileTreeItem";
import { useDraggable } from "@dnd-kit/react";
import DraggedFileItemData, {
	DRAGGED_FILE_ITEM_TYPE,
} from "../types/draggedFileItemData";
import mergeRefs from "../../../utils/mergeRefs";
import { Feedback } from "@dnd-kit/dom";

interface Props {
	isRoot: boolean;
	id: string;
	isFolder: boolean;
	isRenaming: boolean;
	isExpanded: boolean;
	showActions: boolean;
	actions: Action[];
	fullPath: string;
	ref?: React.Ref<FileTreeItemRef>;
	onRenameEnd: () => void;
	onShowActions: () => void;
	onHideActions: () => void;
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	onRenamingCancel: () => void;
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

	const {
		ref: setDragRef,
		handleRef: setHandleDragRef,
		isDragging,
	} = useDraggable({
		id,
		type: DRAGGED_FILE_ITEM_TYPE,
		disabled: isRoot || isRenaming,
		data: { id, isFolder } as DraggedFileItemData,
		plugins: [
			Feedback.configure({ feedback: "clone", dropAnimation: null }),
		],
	});

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

	const handleRenameSubmit = async (
		e: React.SubmitEvent<HTMLFormElement>,
	) => {
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

	const iconPath = getFileTreeIconPath({ isRoot, isFolder, isExpanded });
	const itemName = isRoot ? "Files" : getFileName(fullPath);

	return (
		<>
			<div
				ref={mergeRefs(containerRef, setDragRef)}
				className={`${styles.fileTreeRowContainer} ${isDragging && styles.dragging}`}
				onContextMenu={handleContextMenu}>
				{!isRenaming && (
					<>
						<button
							className={`${styles.fileTreeRow}
                            ${isSelected && !isFolder && !isRenaming ? "primary" : "transparent"}`}
							onClick={onClick}
							title={itemName}
							ref={mergeRefs(buttonRef, setHandleDragRef)}>
							<Icon path={iconPath} size={1} />
							<p>{itemName}</p>
						</button>
						<button
							title="Actions"
							onClick={
								showActions ? onHideActions : onShowActions
							}
							className={`${styles.fileTreeDots}
                            ${isSelected ? styles.fileTreeDotsSelected : ""}`}>
							<Icon path={mdiDotsHorizontal} size={1} />
						</button>
					</>
				)}

				{isRenaming && (
					<form
						onSubmit={e => void handleRenameSubmit(e)}
						className={`${styles.fileTreeRow} ${styles.withForm}`}>
						<Icon path={iconPath} size={1} />

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
							className={`${styles.fileTreeRowInput}`}
						/>
					</form>
				)}
			</div>
			{showActions && (
				<ActionsMenu
					onHide={onHideActions}
					actions={actions}
					containerRef={containerRef}
					className={styles.fileTreeActionsMenu}
				/>
			)}
		</>
	);
}
