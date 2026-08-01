import MessageDto, {
	MessageContentDto,
} from "../../../api/aiIntegration/dto/messageDto";

export interface DisplayMessage {
	id: string;
	content: MessageContentDto;
}

/**
 * Combines the persisted messages of a chat with the ephemeral,
 * not-yet-persisted human prompt and streaming assistant text so the message
 * list can render a consistent view while a response is streaming in.
 *
 * The backend only persists messages once `DefaultAiStreamer::stream`
 * finishes, so until then the human prompt and the assistant's growing reply
 * exist only in memory here.
 */
export function buildDisplayMessages(
	persisted: MessageDto[],
	pendingHumanText: string | null,
	streamingAssistantText: string | null,
): DisplayMessage[] {
	const items: DisplayMessage[] = persisted.map(message => ({
		id: message.id,
		content: message.content,
	}));

	if (pendingHumanText !== null) {
		items.push({
			id: "pending-human",
			content: { type: "human", value: pendingHumanText },
		});
	}

	if (streamingAssistantText !== null) {
		items.push({
			id: "pending-assistant",
			content: { type: "assistant", value: streamingAssistantText },
		});
	}

	return items;
}
