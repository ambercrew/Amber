export default function getFileIconClass(
	isRoot: boolean,
	isFolder: boolean,
): string | undefined {
	if (isRoot) return undefined;
	return isFolder ? "folder-icon" : "file-icon";
}
