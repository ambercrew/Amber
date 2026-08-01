import { describe, expect, it } from "vitest";
import { buildDisplayMessages } from "../../../features/Ai/utils/buildDisplayMessages";
import MessageDto from "../../../api/aiIntegration/dto/messageDto";

function makeMessage(id: string): MessageDto {
	return {
		id,
		createdDate: "2026-01-01T00:00:00Z",
		chatId: "chat-1",
		content: { type: "human", value: `message ${id}` },
	};
}

describe("buildDisplayMessages", () => {
	it("Should return only the persisted messages when nothing is streaming", () => {
		// Arrange

		const persisted = [makeMessage("1"), makeMessage("2")];

		// Act

		const actual = buildDisplayMessages(persisted, null, null);

		// Assert

		expect(actual.map(m => m.id)).toEqual(["1", "2"]);
	});

	it("Should append a pending human message and a streaming assistant message when both are in flight", () => {
		// Arrange

		const persisted = [makeMessage("1")];

		// Act

		const actual = buildDisplayMessages(persisted, "Hi there", "Hello");

		// Assert

		expect(actual).toEqual([
			{ id: "1", content: { type: "human", value: "message 1" } },
			{
				id: "pending-human",
				content: { type: "human", value: "Hi there" },
			},
			{
				id: "pending-assistant",
				content: { type: "assistant", value: "Hello" },
				isStreaming: true,
			},
		]);
	});

	it("Should omit the streaming assistant entry when the streaming text is null", () => {
		// Arrange

		const persisted: MessageDto[] = [];

		// Act

		const actual = buildDisplayMessages(persisted, "Prompt", null);

		// Assert

		expect(actual).toEqual([
			{
				id: "pending-human",
				content: { type: "human", value: "Prompt" },
			},
		]);
	});
});
