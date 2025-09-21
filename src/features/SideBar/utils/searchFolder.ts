import { ReviewTreeFolder } from "../../../types/backend/dto/reviewTreeFolder";
import UiFile from "../../../types/ui/uiFile";
import UiFolder from "../../../types/ui/uiFolder";

function searchFolder(folder: ReviewTreeFolder, searchText: string): UiFolder {
	const subFolders = folder.subfolders.map(f => searchFolder(f, searchText));
	const files: UiFile[] = folder.files.map(f => ({
		...f,
		isVisible: f.name.toLowerCase().includes(searchText.toLowerCase()),
	}));

	const isVisible =
        folder.name.toLowerCase().includes(searchText.toLowerCase()) ||
		searchText.length === 0 ||
		files.some(f => f.isVisible) ||
		subFolders.some(f => f.isVisible);

	return {
		...folder,
		isVisible,
		subfolders: subFolders,
		files,
	};
}

export default searchFolder;
