function getFileName(filePath: string) {
	const index = filePath.lastIndexOf("/");
	return index === -1 ? filePath : filePath.substring(index + 1);
}

export default getFileName;
