import { useState } from "react";
import ConfirmationDialog from "../../../components/ConfirmationDialog/ConfirmationDialog.tsx";
import useAppDispatch from "../../../hooks/useAppDispatch.ts";
import styles from "./styles.module.css";
import {
	deleteFile,
	deleteFolder,
} from "../../../stores/fileSystem/fileSystemActions.ts";
import FileTreeItem from "./FileTreeItem.tsx";
import UiFolder from "../../../types/ui/uiFolder.ts";
import { useNavigate, useSearchParams } from "react-router";
import { FILE_ID_QUERY_PARAMETER } from "../../../config/constants.ts";
import getFolderChildById from "../../../utils/getFolderChildById.ts";
import { mdiDeleteOutline } from "@mdi/js";
import { ReviewTreeFolder } from "../../../types/backend/dto/reviewTreeFolder.ts";

interface Props {
	folder: UiFolder;
}

function FileTree({ folder }: Props) {
	const [fileMarkedForDeletionId, setFileMarkedForDeletionId] = useState<
		string | null
	>(null);
	const [folderMarkedForDeletionId, setFolderMarkedForDeletionId] = useState<
		string | null
	>(null);
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const selectedFileId = searchParams.get(FILE_ID_QUERY_PARAMETER);
	const folderMarkedForDeletion = getFolderChildById(
		folder,
		folderMarkedForDeletionId!,
	) as ReviewTreeFolder | null;

	const handleDelete = async () => {
		if (folderMarkedForDeletionId) {
			await dispatch(deleteFolder(folderMarkedForDeletionId));
			setFolderMarkedForDeletionId(null);
			if (
				selectedFileId &&
				getFolderChildById(folderMarkedForDeletion!, selectedFileId)
			) {
				await navigate("/home", { replace: true });
			}
		}
		if (fileMarkedForDeletionId) {
			await dispatch(deleteFile(fileMarkedForDeletionId));
			setFileMarkedForDeletionId(null);
			if (selectedFileId === fileMarkedForDeletionId) {
				await navigate("/home", { replace: true });
			}
		}
	};

	const handleDeleteCancel = () => {
		setFileMarkedForDeletionId(null);
		setFolderMarkedForDeletionId(null);
	};

	const handleMarkForDeletion = (id: string, isFolder: boolean) => {
		if (isFolder) setFolderMarkedForDeletionId(id);
		else setFileMarkedForDeletionId(id);
	};

	return (
		<>
			{(fileMarkedForDeletionId ?? folderMarkedForDeletionId) && (
				<ConfirmationDialog
					text={`Are you sure you want to delete the selected ${
						fileMarkedForDeletionId ? "file" : "folder"
					}?`}
					title={`Delete ${fileMarkedForDeletionId ? "file" : "folder"}`}
					icon={mdiDeleteOutline}
					onCancel={handleDeleteCancel}
					onConfirm={() => void handleDelete()}
				/>
			)}

			<div className={styles.fileTreeContainer}>
				<FileTreeItem
					fullPath=""
					folder={folder}
					onMarkForDeletion={handleMarkForDeletion}
					id={folder.id}
				/>
			</div>
		</>
	);
}

export default FileTree;
