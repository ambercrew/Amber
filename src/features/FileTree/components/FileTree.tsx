import styles from "./styles.module.css";
import FileTreeItem from "./FileTreeItem.tsx";
import UiFolder from "../../../types/ui/uiFolder.ts";

interface Props {
	folder: UiFolder;
}

function FileTree({ folder }: Props) {
	return (
		<div className={styles.fileTreeContainer}>
			<FileTreeItem fullPath="" folder={folder} id={folder.id} />
		</div>
	);
}

export default FileTree;
