export default interface StreamAiRequestDto {
	prompt: string;
	chatId: string | null;

	openedFileId: string | null;
	focusedCellId: string | null;
}
