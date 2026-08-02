import { act, renderHook } from "@testing-library/react";
import { Channel } from "@tauri-apps/api/core";
import useAiChat from "../../../../features/Ai/hooks/useAiChat";
import {
	createAiChat,
	deleteAiChat,
	getAllAiChatsSortedByDateDesc,
	getChatMessagesOrdered,
	renameAiChat,
	stopAiGeneration,
	streamAiResponse,
	uploadDocument,
} from "../../../../api/aiIntegration/api/aiApi";
import ChatDto from "../../../../api/aiIntegration/dto/chatDto";
import MessageDto from "../../../../api/aiIntegration/dto/messageDto";
import StreamLlmResponseEventDto from "../../../../api/aiIntegration/dto/streamLlmResponseEventDto";

vi.mock(import("../../../../api/aiIntegration/api/aiApi"));

vi.mock("@tauri-apps/api/core", () => {
	class MockChannel {
		onmessage: unknown = null;
	}

	return { Channel: MockChannel };
});

const chat1: ChatDto = { id: "chat-1", title: "Chat 1", createdDate: "date" };
const chat2: ChatDto = { id: "chat-2", title: "Chat 2", createdDate: "date" };

const message1: MessageDto = {
	id: "message-1",
	createdDate: "date",
	chatId: "chat-1",
	content: { type: "human", value: "hi" },
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

function getCapturedChannel() {
	const calls = vi.mocked(streamAiResponse).mock.calls;
	return calls[calls.length - 1][0] as Channel<StreamLlmResponseEventDto>;
}

describe("useAiChat", () => {
	it("Should populate chats when refreshChats resolves", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			chat1,
			chat2,
		]);

		// Act

		const { result } = renderHook(() => useAiChat());
		await act(async () => {
			await result.current.refreshChats();
		});

		// Assert

		expect(result.current.chats).toEqual([chat1, chat2]);
	});

	it("Should set errorMessage when refreshChats fails", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockRejectedValue(
			new Error("Could not load chats"),
		);

		// Act

		const { result } = renderHook(() => useAiChat());
		await act(async () => {
			await result.current.refreshChats();
		});

		// Assert

		expect(result.current.errorMessage).toBe("Could not load chats");
	});

	it("Should select the chat and load its messages when opening a chat", async () => {
		// Arrange

		vi.mocked(getChatMessagesOrdered).mockResolvedValue([message1]);

		// Act

		const { result } = renderHook(() => useAiChat());
		await act(async () => {
			await result.current.openChat("chat-1");
		});

		// Assert

		expect(result.current.selectedChatId).toBe("chat-1");
		expect(result.current.messages).toEqual([message1]);
	});

	it("Should clear the selected chat and messages when starting a new chat", async () => {
		// Arrange

		vi.mocked(getChatMessagesOrdered).mockResolvedValue([message1]);

		const { result } = renderHook(() => useAiChat());
		await act(async () => {
			await result.current.openChat("chat-1");
		});

		// Act

		act(() => {
			result.current.startNewChat();
		});

		// Assert

		expect(result.current.selectedChatId).toBeNull();
		expect(result.current.messages).toEqual([]);
	});

	it("Should remove the chat from the list and start a new chat when deleting the selected chat", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			chat1,
			chat2,
		]);
		vi.mocked(getChatMessagesOrdered).mockResolvedValue([]);

		const { result } = renderHook(() => useAiChat());
		await act(async () => {
			await result.current.refreshChats();
			await result.current.openChat("chat-1");
		});

		// Act

		await act(async () => {
			await result.current.removeChat("chat-1");
		});

		// Assert

		expect(deleteAiChat).toHaveBeenCalledWith("chat-1");
		expect(result.current.chats).toEqual([chat2]);
		expect(result.current.selectedChatId).toBeNull();
	});

	it("Should keep the current selection when deleting a chat that is not selected", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			chat1,
			chat2,
		]);
		vi.mocked(getChatMessagesOrdered).mockResolvedValue([]);

		const { result } = renderHook(() => useAiChat());
		await act(async () => {
			await result.current.refreshChats();
			await result.current.openChat("chat-1");
		});

		// Act

		await act(async () => {
			await result.current.removeChat("chat-2");
		});

		// Assert

		expect(result.current.chats).toEqual([chat1]);
		expect(result.current.selectedChatId).toBe("chat-1");
	});

	it("Should update the chat title when renaming a chat", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			chat1,
			chat2,
		]);

		const { result } = renderHook(() => useAiChat());
		await act(async () => {
			await result.current.refreshChats();
		});

		// Act

		await act(async () => {
			await result.current.renameChat("chat-1", "New name");
		});

		// Assert

		expect(renameAiChat).toHaveBeenCalledWith("chat-1", "New name");
		expect(result.current.chats).toEqual([
			{ ...chat1, title: "New name" },
			chat2,
		]);
	});

	it("Should call stopAiGeneration when stopping generation", async () => {
		// Act

		const { result } = renderHook(() => useAiChat());
		await act(async () => {
			await result.current.stopGeneration();
		});

		// Assert

		expect(stopAiGeneration).toHaveBeenCalled();
	});

	describe("sendPrompt", () => {
		it("Should set pending and streaming state synchronously when sending a prompt", async () => {
			// Arrange

			vi.mocked(streamAiResponse).mockImplementation(
				() => new Promise(noop),
			);

			const { result } = renderHook(() => useAiChat());

			// Act

			await act(async () => {
				void result.current.sendPrompt("hello");
				await Promise.resolve();
			});

			// Assert

			expect(result.current.pendingHumanText).toBe("hello");
			expect(result.current.streamingAssistantText).toBe("");
			expect(result.current.isStreaming).toBe(true);
			expect(streamAiResponse).toHaveBeenCalledWith(expect.anything(), {
				prompt: "hello",
				chatId: null,
			});
		});

		it("Should append inProgress chunks to streamingAssistantText as they arrive", async () => {
			// Arrange

			vi.mocked(streamAiResponse).mockImplementation(
				() => new Promise(noop),
			);
			vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

			const { result } = renderHook(() => useAiChat());
			await act(async () => {
				void result.current.sendPrompt("hello");
				await Promise.resolve();
			});
			const channel = getCapturedChannel();
			act(() => {
				channel.onmessage({ event: "createdChat", data: chat1 });
			});

			// Act

			act(() => {
				channel.onmessage({
					event: "inProgress",
					data: { chatId: "chat-1", text: "Hi" },
				});
			});
			act(() => {
				channel.onmessage({
					event: "inProgress",
					data: { chatId: "chat-1", text: " there" },
				});
			});

			// Assert

			expect(result.current.streamingAssistantText).toBe("Hi there");
		});

		it("Should hide pendingHumanText and streamingAssistantText when the user switches to a different chat", async () => {
			// Arrange

			vi.mocked(streamAiResponse).mockImplementation(
				() => new Promise(noop),
			);
			vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
				chat1,
				chat2,
			]);
			vi.mocked(getChatMessagesOrdered).mockResolvedValue([]);

			const { result } = renderHook(() => useAiChat());
			await act(async () => {
				await result.current.openChat("chat-1");
			});
			await act(async () => {
				void result.current.sendPrompt("hello");
				await Promise.resolve();
			});
			const channel = getCapturedChannel();
			act(() => {
				channel.onmessage({
					event: "inProgress",
					data: { chatId: "chat-1", text: "Hi" },
				});
			});

			// Act

			await act(async () => {
				await result.current.openChat("chat-2");
			});

			// Assert

			expect(result.current.pendingHumanText).toBeNull();
			expect(result.current.streamingAssistantText).toBeNull();
		});

		it("Should select the newly created chat and prepend it to the chat list on createdChat", async () => {
			// Arrange

			vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([chat1]);
			vi.mocked(streamAiResponse).mockImplementation(
				() => new Promise(noop),
			);

			const { result } = renderHook(() => useAiChat());
			await act(async () => {
				await result.current.refreshChats();
			});
			await act(async () => {
				void result.current.sendPrompt("hello");
				await Promise.resolve();
			});
			const channel = getCapturedChannel();

			// Act

			act(() => {
				channel.onmessage({ event: "createdChat", data: chat2 });
			});

			// Assert

			expect(result.current.selectedChatId).toBe("chat-2");
			expect(result.current.chats).toEqual([chat2, chat1]);
		});

		it("Should set streamError when an error event is received", async () => {
			// Arrange

			vi.mocked(streamAiResponse).mockImplementation(
				() => new Promise(noop),
			);

			const { result } = renderHook(() => useAiChat());
			await act(async () => {
				void result.current.sendPrompt("hello");
				await Promise.resolve();
			});
			const channel = getCapturedChannel();

			// Act

			act(() => {
				channel.onmessage({
					event: "error",
					data: "Something went wrong",
				});
			});

			// Assert

			expect(result.current.streamError).toBe("Something went wrong");
		});

		it("Should clear streamError when starting a new prompt", async () => {
			// Arrange

			vi.mocked(streamAiResponse).mockImplementation(
				() => new Promise(noop),
			);

			const { result } = renderHook(() => useAiChat());
			await act(async () => {
				void result.current.sendPrompt("hello");
				await Promise.resolve();
			});
			let channel = getCapturedChannel();
			act(() => {
				channel.onmessage({ event: "error", data: "Boom" });
			});
			expect(result.current.streamError).toBe("Boom");

			// Act

			await act(async () => {
				void result.current.sendPrompt("hello again");
				await Promise.resolve();
			});
			channel = getCapturedChannel();

			// Assert

			expect(result.current.streamError).toBeNull();
		});

		it("Should reset streaming state and refresh messages and chats once the stream finishes", async () => {
			// Arrange

			let resolveStream: () => void = noop;
			vi.mocked(streamAiResponse).mockImplementation(
				() =>
					new Promise(resolve => {
						resolveStream = resolve;
					}),
			);
			vi.mocked(getChatMessagesOrdered).mockResolvedValue([message1]);
			vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([chat1]);

			const { result } = renderHook(() => useAiChat());
			let sendPromise!: Promise<void>;
			await act(async () => {
				sendPromise = result.current.sendPrompt("hello");
				await Promise.resolve();
			});
			const channel = getCapturedChannel();
			act(() => {
				channel.onmessage({ event: "createdChat", data: chat1 });
			});

			// Act

			await act(async () => {
				resolveStream();
				await sendPromise;
			});

			// Assert

			expect(result.current.isStreaming).toBe(false);
			expect(result.current.pendingHumanText).toBeNull();
			expect(result.current.streamingAssistantText).toBeNull();
			expect(getChatMessagesOrdered).toHaveBeenCalledWith("chat-1");
			expect(result.current.messages).toEqual([message1]);
			expect(getAllAiChatsSortedByDateDesc).toHaveBeenCalled();
		});

		it("Should not fetch messages when the stream finishes without an active chat id", async () => {
			// Arrange

			let resolveStream: () => void = noop;
			vi.mocked(streamAiResponse).mockImplementation(
				() =>
					new Promise(resolve => {
						resolveStream = resolve;
					}),
			);
			vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

			const { result } = renderHook(() => useAiChat());
			let sendPromise!: Promise<void>;
			await act(async () => {
				sendPromise = result.current.sendPrompt("hello");
				await Promise.resolve();
			});

			// Act

			await act(async () => {
				resolveStream();
				await sendPromise;
			});

			// Assert

			expect(getChatMessagesOrdered).not.toHaveBeenCalled();
		});

		it("Should keep streaming the same chat's messages when continuing an existing chat", async () => {
			// Arrange

			vi.mocked(getChatMessagesOrdered).mockResolvedValue([]);
			let resolveStream: () => void = noop;
			vi.mocked(streamAiResponse).mockImplementation(
				() =>
					new Promise(resolve => {
						resolveStream = resolve;
					}),
			);
			vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([chat1]);

			const { result } = renderHook(() => useAiChat());
			await act(async () => {
				await result.current.openChat("chat-1");
			});

			// Act

			let sendPromise!: Promise<void>;
			await act(async () => {
				sendPromise = result.current.sendPrompt("hello again");
				await Promise.resolve();
			});
			await act(async () => {
				resolveStream();
				await sendPromise;
			});

			// Assert

			expect(streamAiResponse).toHaveBeenCalledWith(expect.anything(), {
				prompt: "hello again",
				chatId: "chat-1",
			});
			expect(getChatMessagesOrdered).toHaveBeenLastCalledWith("chat-1");
		});

		it("Should set errorMessage when streamAiResponse throws, while still resetting streaming state", async () => {
			// Arrange

			vi.mocked(streamAiResponse).mockRejectedValue(
				new Error("Network error"),
			);
			vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

			// Act

			const { result } = renderHook(() => useAiChat());
			await act(async () => {
				await result.current.sendPrompt("hello");
			});

			// Assert

			expect(result.current.errorMessage).toBe("Network error");
			expect(result.current.isStreaming).toBe(false);
			expect(result.current.pendingHumanText).toBeNull();
		});
	});

	describe("uploadDocumentToChat", () => {
		it("Should create a new chat named after the file when no chat is selected", async () => {
			// Arrange

			vi.mocked(createAiChat).mockResolvedValue(chat1);
			vi.mocked(getChatMessagesOrdered).mockResolvedValue([]);

			const { result } = renderHook(() => useAiChat());

			// Act

			await act(async () => {
				await result.current.uploadDocumentToChat(
					"/home/user/notes.pdf",
				);
			});

			// Assert

			expect(createAiChat).toHaveBeenCalledWith("notes.pdf");
			expect(uploadDocument).toHaveBeenCalledWith(
				"/home/user/notes.pdf",
				"chat-1",
			);
			expect(result.current.selectedChatId).toBe("chat-1");
			expect(result.current.chats).toEqual([chat1]);
		});

		it("Should upload to the currently selected chat without creating a new one", async () => {
			// Arrange

			vi.mocked(getChatMessagesOrdered).mockResolvedValue([]);

			const { result } = renderHook(() => useAiChat());
			await act(async () => {
				await result.current.openChat("chat-1");
			});

			// Act

			await act(async () => {
				await result.current.uploadDocumentToChat(
					"/home/user/notes.pdf",
				);
			});

			// Assert

			expect(createAiChat).not.toHaveBeenCalled();
			expect(uploadDocument).toHaveBeenCalledWith(
				"/home/user/notes.pdf",
				"chat-1",
			);
		});
	});
});
