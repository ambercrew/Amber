import ParsedFile from "../types/parsedFile";
import ParsedFolder from "../types/parsedFolder";

function getFolderChildById(
	folder: ParsedFolder,
	id: number,
): ParsedFile | ParsedFolder | null {
	let queue = [folder];

	while (queue.length > 0) {
		const folder = queue.pop()!;
		if (folder.id === id) return folder;

		for (const file of folder.files) {
			if (file.id === id) return file;
		}
		queue = [...queue, ...folder.subFolders];
	}

	return null;
}

export default getFolderChildById;
