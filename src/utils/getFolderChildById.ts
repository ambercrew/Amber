import { ReviewTreeFileDto } from "../api/fileSystem/dto/reviewTreeFileDto";
import { ReviewTreeFolderDto } from "../api/fileSystem/dto/reviewTreeFolderDto";

function getFolderChildById(
	folder: ReviewTreeFolderDto,
	id: string,
): ReviewTreeFolderDto | ReviewTreeFileDto | null {
	let queue = [folder];

	while (queue.length > 0) {
		const folder = queue.pop()!;
		if (folder.id === id) return folder;

		for (const file of folder.files) {
			if (file.id === id) return file;
		}
		queue = [...queue, ...folder.subfolders];
	}

	return null;
}

export default getFolderChildById;
