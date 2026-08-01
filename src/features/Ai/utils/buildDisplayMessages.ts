import MessageDto, {
	MessageContentDto,
} from "../../../api/aiIntegration/dto/messageDto";

export interface DisplayMessage {
	id: string;
	content: MessageContentDto;
	/** Name of the tool a `toolCall`/`toolResult` message belongs to, resolved by matching ids. */
	toolName?: string;
	/** Whether this is the assistant reply currently being streamed in. */
	isStreaming?: boolean;
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
	// `toolResult` messages don't carry the tool's name, only the id of the
	// `toolCall` they answer, so it has to be looked up from that call.
	const toolNamesById = new Map<string, string>();
	for (const message of persisted) {
		if (message.content.type === "toolCall") {
			toolNamesById.set(
				message.content.value.id,
				message.content.value.name,
			);
		}
	}

	const items: DisplayMessage[] = persisted.map(message => {
		const toolName =
			message.content.type === "toolCall"
				? message.content.value.name
				: message.content.type === "toolResult"
					? toolNamesById.get(message.content.value.id)
					: undefined;

		return {
			id: message.id,
			content: message.content,
			...(toolName !== undefined && { toolName }),
		};
	});

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
			isStreaming: true,
		});
	}

	return items;
}
