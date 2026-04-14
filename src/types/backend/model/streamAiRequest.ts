export default interface StreamAiRequest {
	prompt: string;
	chatId: string | null;
	fileId: string | null;
}
