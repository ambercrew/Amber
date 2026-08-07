import { ElementId } from "../../../types/elements/elementId";

export default interface StreamAiRequestDto {
	prompt: string;
	chatId: string | null;
	elementId: ElementId | null;
	contextSnippets: string[];
}
