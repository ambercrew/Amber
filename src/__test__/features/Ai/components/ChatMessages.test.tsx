import { render } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import {
	useStickToBottom,
	type StickToBottomInstance,
} from "use-stick-to-bottom";
import ChatMessages from "../../../../features/Ai/components/ChatMessages";
import { DisplayMessage } from "../../../../features/Ai/utils/buildDisplayMessages";

vi.mock(import("use-stick-to-bottom"));

function makeRefCallback() {
	return vi.fn() as unknown as StickToBottomInstance["scrollRef"];
}

function makeMessage(id: string): DisplayMessage {
	return { id, content: { type: "human", value: `message ${id}` } };
}

function renderChatMessages(
	messages: DisplayMessage[],
	chatId: string | null = "chat-1",
) {
	return render(
		<MantineProvider>
			<ChatMessages chatId={chatId} messages={messages} />
		</MantineProvider>,
	);
}

const scrollToBottomMock = vi.fn();

beforeEach(() => {
	scrollToBottomMock.mockClear();
	vi.mocked(useStickToBottom).mockReturnValue({
		scrollRef: makeRefCallback(),
		contentRef: makeRefCallback(),
		scrollToBottom: scrollToBottomMock,
		stopScroll: vi.fn(),
		isAtBottom: true,
		isNearBottom: true,
		escapedFromLock: false,
		state: {} as ReturnType<typeof useStickToBottom>["state"],
	});
});

describe("ChatMessages", () => {
	it("Should render every message", () => {
		// Arrange

		const messages = [makeMessage("1"), makeMessage("2")];

		// Act

		const { getByText } = renderChatMessages(messages);

		// Assert

		expect(getByText("message 1")).toBeInTheDocument();
		expect(getByText("message 2")).toBeInTheDocument();
	});

	it("Should show a placeholder when there are no messages", () => {
		// Arrange

		// Act

		const { getByText } = renderChatMessages([]);

		// Assert

		expect(
			getByText("Ask a question to start a conversation."),
		).toBeInTheDocument();
	});

	it("Should jump to the bottom instantly on mount", () => {
		// Arrange

		// Act

		renderChatMessages([makeMessage("1")]);

		// Assert

		expect(scrollToBottomMock).toHaveBeenCalledWith({
			animation: "instant",
		});
	});

	it("Should jump to the bottom instantly when switching chats", () => {
		// Arrange

		const { rerender } = renderChatMessages([makeMessage("1")], "chat-1");
		scrollToBottomMock.mockClear();

		// Act

		rerender(
			<MantineProvider>
				<ChatMessages chatId="chat-2" messages={[makeMessage("2")]} />
			</MantineProvider>,
		);

		// Assert

		expect(scrollToBottomMock).toHaveBeenCalledWith({
			animation: "instant",
		});
	});

	it("Should not jump to the bottom again when the same chat receives a new message", () => {
		// Arrange

		const { rerender } = renderChatMessages([makeMessage("1")], "chat-1");
		scrollToBottomMock.mockClear();

		// Act

		rerender(
			<MantineProvider>
				<ChatMessages
					chatId="chat-1"
					messages={[makeMessage("1"), makeMessage("2")]}
				/>
			</MantineProvider>,
		);

		// Assert

		expect(scrollToBottomMock).not.toHaveBeenCalled();
	});
});
