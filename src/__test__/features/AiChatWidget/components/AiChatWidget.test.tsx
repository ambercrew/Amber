import { screen } from "@testing-library/react";
import AiChatWidget from "../../../../features/AiChatWidget/components/AiChatWidget";
import Settings from "../../../../types/backend/model/settings";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import {
	getAllAiChatsSortedByDateDesc,
	getChatMessagesOrdered,
	stopAiGeneration,
	streamAiResponse,
} from "../../../../api/aiApi.ts";
import userEvent from "@testing-library/user-event";
import Message from "../../../../features/AiChatWidget/types/message.ts";
import { Channel } from "@tauri-apps/api/core";
import { StreamLlmResponseEvent } from "../../../../types/backend/events/streamLlmResponseEvent.ts";

vi.mock(import("../../../../api/aiApi.ts"));

vi.mock("@tauri-apps/api/core", () => {
	class MockChannel {
		onmessage: unknown = null;
	}

	return {
		Channel: MockChannel,
	};
});

function renderComponent({ enableAi = true }) {
	return renderWithProviders(<AiChatWidget />, {
		preloadedState: {
			settings: {
				settings: {
					enableAi,
				} as Partial<Settings> as Settings,
			},
		},
	});
}

async function openChat() {
	await userEvent.click(
		await screen.findByTitle("Open AI assistant (Ctrl + J)"),
	);
}

describe("AiChatWidget", () => {
	it("Should not show open chat button when AI is not enabled", () => {
		// Act

		renderComponent({ enableAi: false });

		// Assert

		expect(screen.queryByTitle("Open AI assistant (Ctrl + J)")).toBeNull();
	});

	it("Should get all chats initial", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([
				{
					id: "chat-1",
					title: "chat 1",
					createdDate: "date",
				},
				{
					id: "chat-2",
					title: "chat 2",
					createdDate: "date",
				},
				{
					id: "chat-3",
					title: "chat 3",
					createdDate: "date",
				},
			]),
		);
		renderComponent({});

		// Act

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));

		// Assert

		expect(screen.findByText("chat 2")).not.toBeNull();
		expect(screen.findByText("chat 3")).not.toBeNull();
	});

	it("Should get and show chat message when switching session", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([
				{
					id: "chat-1",
					title: "chat 1",
					createdDate: "date",
				},
				{
					id: "chat-2",
					title: "chat 2",
					createdDate: "date",
				},
			]),
		);

		vi.mocked(getChatMessagesOrdered).mockImplementation(id => {
			if (id === "chat-1") {
				return Promise.resolve([
					{
						id: "message-1",
						chatId: "chat-1",
						role: "human",
						content: "message 1",
					} as Message,
				]);
			} else {
				return Promise.resolve([
					{
						id: "message-2",
						chatId: "chat-2",
						role: "human",
						content: "message 2",
					} as Message,
				]);
			}
		});

		renderComponent({});

		// Act & Assert

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));

		await userEvent.click(await screen.findByText("chat 1"));
		expect(screen.queryByText("message 1")).not.toBeNull();

		await userEvent.click(await screen.findByText("chat 1"));
		await userEvent.click(await screen.findByText("chat 2"));
		expect(screen.queryByText("message 2")).not.toBeNull();
	});

	it("Should delete session correctly", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc)
			.mockReturnValueOnce(
				Promise.resolve([
					{
						id: "chat-1",
						title: "chat 1",
						createdDate: "date",
					},
					{
						id: "chat-2",
						title: "chat 2",
						createdDate: "date",
					},
				]),
			)
			.mockReturnValueOnce(
				Promise.resolve([
					{
						id: "chat-2",
						title: "chat 2",
						createdDate: "date",
					},
				]),
			);

		renderComponent({});

		// Act & Assert

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));

		await userEvent.click(await screen.findByText("chat 1"));
		await userEvent.click(await screen.findByTitle("Delete chat"));
		await userEvent.click(await screen.findByText("Yes"));

		await userEvent.click(await screen.findByText("+ New chat"));
		await screen.findByText("chat 2");
		expect(screen.queryByText("chat 1")).toBeNull();
	});

	it("Should show streamed responses correctly", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([]),
		);

		let capturedOnEvent: Channel<StreamLlmResponseEvent> | null = null;
		let finishedStreaming = false;
		vi.mocked(streamAiResponse).mockImplementation(
			async (prompt, chatId, onEvent) => {
				if (prompt === "hello" && chatId === null) {
					capturedOnEvent = onEvent;
				}

				while (!finishedStreaming) {
					await new Promise(resolve => setTimeout(resolve, 20));
				}
			},
		);

		renderComponent({});

		// Act & Assert

		await openChat();
		await userEvent.click(await screen.findByRole("textbox"));
		await userEvent.keyboard("hello{Enter}");
		expect(await screen.findByRole("textbox")).toHaveTextContent("");
		await screen.findByText("hello");

		expect(capturedOnEvent).not.toBeNull();
		capturedOnEvent!.onmessage({
			event: "createdChat",
			data: {
				id: "chat-1",
				title: "chat 1",
				createdDate: "date",
			},
		});
		await screen.findByText("chat 1");

		capturedOnEvent!.onmessage({
			event: "inProgress",
			data: "message from",
		});
		await screen.findByText("message from");
		capturedOnEvent!.onmessage({
			event: "inProgress",
			data: " AI",
		});
		await screen.findByText("message from AI");

		await screen.findByTitle("Stop");
		capturedOnEvent!.onmessage({
			event: "finished",
		});
		finishedStreaming = true;
		await screen.findByTitle("Send");
	});

	it("Should show error when streaming a response", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([]),
		);
		vi.mocked(getChatMessagesOrdered).mockImplementation(id => {
			if (id === "chat-1") {
				return Promise.resolve([
					{
						id: "message-1",
						chatId: "chat-1",
						role: "human",
						content: "retrieved message",
					} as Message,
				]);
			}
			return Promise.resolve([]);
		});

		let capturedOnEvent: Channel<StreamLlmResponseEvent> | null = null;
		let finishedStreaming = false;
		vi.mocked(streamAiResponse).mockImplementation(
			async (_, __, onEvent) => {
				capturedOnEvent = onEvent;
				while (!finishedStreaming) {
					await new Promise(resolve => setTimeout(resolve, 20));
				}
			},
		);

		renderComponent({});

		// Act & Assert

		await openChat();
		await userEvent.click(await screen.findByRole("textbox"));
		await userEvent.keyboard("hello{Enter}");
		expect(await screen.findByRole("textbox")).toHaveTextContent("");
		await screen.findByText("hello");
		expect(capturedOnEvent).not.toBeNull();

		capturedOnEvent!.onmessage({
			event: "createdChat",
			data: {
				id: "chat-1",
				title: "chat 1",
				createdDate: "date",
			},
		});

		capturedOnEvent!.onmessage({
			event: "inProgress",
			data: "Ai response",
		});
		await screen.findByText("Ai response");

		capturedOnEvent!.onmessage({
			event: "error",
			data: "An error has happened",
		});

		finishedStreaming = true;
		capturedOnEvent!.onmessage({
			event: "finished",
		});

		await screen.findByText("An error has happened");
		// Asserting that the chat retrieved that latest messages.
		await screen.findByText("retrieved message");
	});

	it("Should be able to stop generating when streaming", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([]),
		);

		renderComponent({});

		// Act

		await openChat();
		await userEvent.click(await screen.findByRole("textbox"));
		await userEvent.keyboard("hello{Enter}");
		await userEvent.click(screen.getByTitle("Stop"));

		// Assert

		expect(vi.mocked(stopAiGeneration)).toBeCalled();
	});

	it("Should stop generation when unmounted", () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([]),
		);

		const { unmount } = renderComponent({});

		// Act

		unmount();

		// Assert

		expect(vi.mocked(stopAiGeneration)).toBeCalled();
	});

	it("Should open chat when shortcut is pressed", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([]),
		);

		renderComponent({});

		// Act

		await userEvent.keyboard("{Control>}j");

		// Assert

		expect(screen.queryByRole("textbox")).not.toBeNull();
	});

	it("Should hide the chat when Escape is pressed", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([]),
		);

		renderComponent({});

		// Act

		await openChat();
		await userEvent.click(await screen.findByRole("textbox"));
		await userEvent.keyboard("{Escape}");

		// Assert

		expect(screen.queryByRole("textbox")).toBeNull();
	});

	it("Should not send message when shift is pressed", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([]),
		);

		renderComponent({});

		// Act

		await openChat();
		await userEvent.click(await screen.findByRole("textbox"));
		await userEvent.keyboard("First{Shift>}{Enter}Second");

		// Assert

		expect(screen.queryByRole("textbox")).toHaveTextContent("First Second");
	});

	it("Should scroll to the bottom on changing chat", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockReturnValue(
			Promise.resolve([
				{
					id: "chat-1",
					title: "chat 1",
					createdDate: "date",
				},
			]),
		);

		vi.mocked(getChatMessagesOrdered).mockReturnValue(
			Promise.resolve([
				{
					id: "message-1",
					chatId: "chat-1",
					role: "human",
					content: "message 1",
				} as Message,
			]),
		);

		renderComponent({});

		// Act

		await openChat();
		const element = await screen.findByTestId("messages-container");
		Object.defineProperty(element, "scrollHeight", {
			value: 10,
		});

		await userEvent.click(await screen.findByText("+ New chat"));
		await userEvent.click(await screen.findByText("chat 1"));

		// Assert

		expect(element.scrollTop).toBe(10);
	});
});
