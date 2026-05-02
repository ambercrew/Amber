export default interface StreamAiRequestDto {
	prompt: string;
	chatId: string | null;
	fileId: string | null;
}
