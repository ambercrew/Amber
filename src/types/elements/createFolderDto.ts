export interface CreateFolderDto {
	name: string;
	position: number;
	parentFolderId: string | null;
}
