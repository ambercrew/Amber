export default interface Message {
	id: string;
	chatId: string;
	role: "human" | "assistant";
	content: string | null;
}
