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
import { Action } from "./ActionsMenu";
import getFileName from "../../util/getFileName";
import { useEffect, useState } from "react";
import {
	renameFile,
	renameFolder,
} from "../../store/actions/fileSystemActions";
import useAppDispatch from "../../hooks/useAppDispatch";
import { useSearchParams } from "react-router";
import { fileIdQueryParameter } from "../../constants";

interface Props {
	isRoot: boolean;
	id: number;
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
	const selectedFileId = Number(searchParams.get(fileIdQueryParameter));
	const dispatch = useAppDispatch();
	const isSelected = selectedFileId === id && !isRoot;

	useEffect(() => {
		if (!isRenaming) setNewName(getFileName(fullPath));
	}, [isRenaming, fullPath]);

	const handleRenameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (isFolder) await dispatch(renameFolder(id, newName));
		else await dispatch(renameFile(id, newName));

		onRenameEnd();
	};

	/* Closing the actions menu using the same buttons to open it does not close it */
	return (
		<div
			className={`${styles.fileTreeRow}`}
			draggable={!isRoot && !isRenaming}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}>
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
						<input
							type="text"
							value={newName}
							onChange={e => setNewName(e.target.value)}
							onFocus={e => e.target.select()}
							autoFocus
							className={`${styles.fileTreeRenameInput}`}
							onBlur={onStopRenaming}
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

			{showActions && (
				<ActionsMenu onOutsideClick={onHideActions} actions={actions} />
			)}
		</div>
	);
}

export default FileTreeItemRow;
