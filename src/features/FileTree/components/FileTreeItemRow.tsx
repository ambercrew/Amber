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
import { useEffect, useRef, useState } from "react";
import {
	renameFile,
	renameFolder,
} from "../../../stores/fileSystem/fileSystemActions";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { useSearchParams } from "react-router";
import { fileIdQueryParameter } from "../../../config/constants";
import useOutsideClick from "../../../hooks/useOutsideClick";
import CancellableInput from "../../../components/CancellableInput/CancellableInput";

interface Props {
	isRoot: boolean;
	id: string;
	isFolder: boolean;
	isRenaming: boolean;
	isExpanded: boolean;
	showActions: boolean;
	actions: Action[];
	fullPath: string;
	onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
	onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
	onRenameEnd: () => void;
	onShowActionsClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	onHideActions: () => void;
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
	onStopRenaming: () => void;
}

function FileTreeItemRow({
	isRoot,
	id,
	isFolder,
	isRenaming,
	isExpanded,
	showActions,
	actions,
	fullPath,
	onDragStart,
	onDragEnd,
	onRenameEnd,
	onShowActionsClick,
	onClick,
	onHideActions,
	onStopRenaming,
}: Props) {
	const [newName, setNewName] = useState(getFileName(fullPath));
	const [searchParams] = useSearchParams();
	const selectedFileId = searchParams.get(fileIdQueryParameter);
	const dispatch = useAppDispatch();
	const isSelected = selectedFileId === id && !isRoot;
	const containerRef = useRef<HTMLDivElement>(null);

	useOutsideClick(
		containerRef as React.RefObject<HTMLElement>,
		onHideActions,
	);

	useEffect(() => {
		if (!isRenaming) setNewName(getFileName(fullPath));
	}, [isRenaming, fullPath]);

	const handleRenameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (isFolder) await dispatch(renameFolder(id, newName));
		else await dispatch(renameFile(id, newName));

		onRenameEnd();
	};

	return (
		<>
			<div
				className={`${styles.fileTreeRow}`}
				draggable={!isRoot && !isRenaming}
				onDragStart={onDragStart}
				onDragEnd={onDragEnd}
				ref={containerRef}>
				<button
					className={`${styles.fileTreeButton}
                ${isSelected && !isFolder && !isRenaming ? "primary" : "transparent"}`}
					onClick={onClick}>
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
                                onCancel={onStopRenaming}
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
						onClick={onShowActionsClick}
						className={`${styles.fileTreeDots}
                        ${isSelected ? styles.fileTreeDotsSelected : ""}`}>
						<Icon path={mdiDotsHorizontal} size={1} />
					</button>
				)}
			</div>
			{showActions && <ActionsMenu actions={actions} />}
		</>
	);
}

export default FileTreeItemRow;
