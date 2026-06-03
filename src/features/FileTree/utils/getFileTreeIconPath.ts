import {
	mdiFileDocumentOutline,
	mdiFileTreeOutline,
	mdiFolderOpenOutline,
	mdiFolderOutline,
} from "@mdi/js";

export default function getFileTreeIconPath({
	isRoot,
	isFolder,
	isExpanded,
}: {
	isRoot: boolean;
	isFolder: boolean;
	isExpanded: boolean;
}): string {
	if (isRoot) return mdiFileTreeOutline;
	if (isFolder) return isExpanded ? mdiFolderOpenOutline : mdiFolderOutline;
	return mdiFileDocumentOutline;
}
