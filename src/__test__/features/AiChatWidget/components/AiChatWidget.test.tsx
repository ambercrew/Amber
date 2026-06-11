import { screen } from "@testing-library/react";
import AiChatWidget from "../../../../features/AiChatWidget/components/AiChatWidget";
import UpdateSettingsRequestDto from "../../../../api/settings/dto/updateSettingsRequestDto.ts";
import { renderWithProviders } from "../../../test-utils/renderWithProviders";
import {
	acceptToolCall,
	getAllAiChatsSortedByDateDesc,
	getChatMessagesOrdered,
	rejectToolCall,
	renameAiChat,
	stopAiGeneration,
	streamAiResponse,
	uploadDocument,
} from "../../../../api/aiIntegration/api/aiApi.ts";
import userEvent from "@testing-library/user-event";
import Message, {
	ToolCallStatus,
} from "../../../../api/aiIntegration/entities/message.ts";
import { Channel } from "@tauri-apps/api/core";
import { StreamLlmResponseEvent } from "../../../../api/aiIntegration/events/streamLlmResponseEvent.ts";
import { MemoryRouterProps } from "react-router";
import { FILE_ID_QUERY_PARAMETER } from "../../../../config/constants.ts";
import { RootState } from "../../../../stores/store.ts";
import { ReviewTreeFolderDto } from "../../../../api/fileSystem/dto/reviewTreeFolderDto.ts";
import { TOOL_CALL_ACCEPTED_EVENT } from "../../../../types/events/toolCallAcceptedEvent.ts";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentLocation } from "../../../test-utils/locationUtils.ts";

vi.mock(import("../../../../api/aiIntegration/api/aiApi.ts"));

vi.mock("@tauri-apps/api/core", () => {
	class MockChannel {
		onmessage: unknown = null;
	}

	return {
		Channel: MockChannel,
	};
});

vi.mock("@tauri-apps/plugin-dialog");

vi.mock(import("../../../../utils/tauriUtils.ts"), () => ({
	isAndroid: vi.fn(() => true),
}));

function renderComponent({
	enableAi = true,
	memoryRouterProps = {} as MemoryRouterProps,
	preloadedState = {} as Partial<RootState>,
}) {
	return renderWithProviders(<AiChatWidget />, {
		memoryRouterProps,
		preloadedState: {
			settings: {
				settings: {
					enableAi,
				} as UpdateSettingsRequestDto,
			},
			...preloadedState,
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

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
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
		]);
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

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
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
		]);

		vi.mocked(getChatMessagesOrdered).mockImplementation(id => {
			if (id === "chat-1") {
				return Promise.resolve([
					{
						id: "message-1",
						chatId: "chat-1",
						content: {
							type: "human",
							value: "message 1",
						},
					} as Message,
				]);
			} else {
				return Promise.resolve([
					{
						id: "message-2",
						chatId: "chat-2",
						content: {
							type: "human",
							value: "message 2",
						},
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
			.mockResolvedValueOnce([
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
			])
			.mockResolvedValueOnce([
				{
					id: "chat-2",
					title: "chat 2",
					createdDate: "date",
				},
			]);

		renderComponent({});

		// Act & Assert

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));

		await userEvent.click(await screen.findByText("chat 1"));
		await userEvent.click(await screen.findByTitle("Actions"));
		await userEvent.click(await screen.findByText("Delete chat"));
		await userEvent.click(await screen.findByText("Yes"));

		await userEvent.click(await screen.findByText("+ New chat"));
		await screen.findByText("chat 2");
		expect(screen.queryByText("chat 1")).toBeNull();
	});

	it("Should show streamed responses correctly", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

		let capturedOnEvent: Channel<StreamLlmResponseEvent> | null = null;
		let finishedStreaming = false;
		vi.mocked(streamAiResponse).mockImplementation(
			async ({ prompt, chatId, openedFileId: fileId }, onEvent) => {
				if (
					prompt === "hello" &&
					chatId === null &&
					fileId === "file-123"
				) {
					capturedOnEvent = onEvent;
				}

				while (!finishedStreaming) {
					await new Promise(resolve => setTimeout(resolve, 20));
				}
			},
		);

		renderComponent({
			memoryRouterProps: {
				initialEntries: [`?${FILE_ID_QUERY_PARAMETER}=file-123`],
			},
		});

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

		capturedOnEvent!.onmessage({
			event: "toolCalled",
			data: {
				id: "",
				chatId: "",
				content: {
					type: "toolCallDisplay",
					value: {
						id: "",
						displayDescriptionMarkdown: "**Question**",
						displayName: "Create FlashCard",
						name: "",
						arguments: {},
						fileId: "",
						status: ToolCallStatus.Accepted,
					},
				},
			},
		});
		await screen.findByText("Create FlashCard");
		await screen.findByText("Accepted");

		await screen.findByTitle("Stop");
		finishedStreaming = true;

		await screen.findByTitle("Send");
	});

	it("Should show error when streaming a response", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);
		vi.mocked(getChatMessagesOrdered).mockImplementation(id => {
			if (id === "chat-1") {
				return Promise.resolve([
					{
						id: "message-1",
						chatId: "chat-1",
						content: {
							type: "human",
							value: "retrieved message",
						},
					} as Message,
				]);
			}
			return Promise.resolve([]);
		});

		let capturedOnEvent: Channel<StreamLlmResponseEvent> | null = null;
		let finishedStreaming = false;
		vi.mocked(streamAiResponse).mockImplementation(async (_, onEvent) => {
			capturedOnEvent = onEvent;
			while (!finishedStreaming) {
				await new Promise(resolve => setTimeout(resolve, 20));
			}
		});

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

		await screen.findByText("An error has happened");
		// Asserting that the chat retrieved that latest messages.
		await screen.findByText("retrieved message");
	});

	it("Should be able to stop generating when streaming", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

		let finishedStreaming = false;
		vi.mocked(streamAiResponse).mockImplementation(async () => {
			while (!finishedStreaming) {
				await new Promise(resolve => setTimeout(resolve, 20));
			}
		});

		renderComponent({});

		// Act

		await openChat();
		await userEvent.click(await screen.findByRole("textbox"));
		await userEvent.keyboard("hello{Enter}");
		await userEvent.click(screen.getByTitle("Stop"));
		finishedStreaming = true;

		// Assert

		expect(vi.mocked(stopAiGeneration)).toHaveBeenCalled();
	});

	it("Should stop generation when unmounted", () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

		const { unmount } = renderComponent({});

		// Act

		unmount();

		// Assert

		expect(vi.mocked(stopAiGeneration)).toHaveBeenCalled();
	});

	it("Should toggle chat when shortcut is pressed", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

		renderComponent({});

		// Act & Assert

		await userEvent.keyboard("{Control>}j");
		expect(screen.queryByRole("textbox")).not.toBeNull();
		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("textbox")).toBeNull();
	});

	it("Should hide the chat when Escape is pressed", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

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

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([]);

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

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			{
				id: "chat-1",
				title: "chat 1",
				createdDate: "date",
			},
		]);

		vi.mocked(getChatMessagesOrdered).mockResolvedValue([
			{
				id: "message-1",
				chatId: "chat-1",
				content: {
					type: "human",
					value: "message 1",
				},
			} as Message,
		]);

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

	it("Should be able to rename chat", async () => {
		// Arrange

		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			{
				id: "chat-1",
				title: "chat 1",
				createdDate: "date",
			},
		]);

		renderComponent({});

		// Act

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));
		await userEvent.click(await screen.findByText("chat 1"));
		await userEvent.click(await screen.findByTitle("Actions"));
		await userEvent.click(await screen.findByText("Rename chat"));
		await userEvent.keyboard("{Backspace>100}New name{Enter}");

		// Assert

		expect(vi.mocked(renameAiChat)).toHaveBeenCalledWith(
			"chat-1",
			"New name",
		);
	});
});

describe("ToolCallDisplay", () => {
	it("Should be able to accept tool call and dispatch event", async () => {
		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			{
				id: "chat-1",
				title: "chat 1",
				createdDate: "date",
			},
		]);

		vi.mocked(getChatMessagesOrdered)
			.mockResolvedValueOnce([
				{
					id: "message-1",
					chatId: "chat-1",
					content: {
						type: "toolCallDisplay",
						value: {
							displayName: "Create FlashCard",
							displayDescriptionMarkdown: "Question",
							status: ToolCallStatus.Pending,
							fileId: "file-1",
							name: "",
							arguments: {},
						},
					},
				} as Message,
			])
			.mockResolvedValueOnce([
				{
					id: "message-1",
					chatId: "chat-1",
					content: {
						type: "toolCallDisplay",
						value: {
							displayName: "Create FlashCard",
							displayDescriptionMarkdown: "Question",
							fileId: "file-1",
							status: ToolCallStatus.Accepted,
							name: "",
							arguments: {},
						},
					},
				} as Message,
			]);

		let calledEventFileId = null;
		window.addEventListener(TOOL_CALL_ACCEPTED_EVENT, event => {
			calledEventFileId = event.detail.fileId;
		});

		renderComponent({
			preloadedState: {
				fileSystem: {
					errorMessage: "",
					successMessage: "",
					rootFolder: {
						files: [
							{
								id: "file-1",
							},
						],
					} as unknown as ReviewTreeFolderDto,
				},
			},
		});

		// Act

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));
		await userEvent.click(await screen.findByText("chat 1"));
		await userEvent.click(await screen.findByText("Accept"));
		await screen.findByText("Accepted");

		// Assert

		expect(vi.mocked(acceptToolCall)).toHaveBeenCalledWith("message-1");
		expect(calledEventFileId).toBe("file-1");
	});

	it("Should be able to reject tool call", async () => {
		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			{
				id: "chat-1",
				title: "chat 1",
				createdDate: "date",
			},
		]);

		vi.mocked(getChatMessagesOrdered)
			.mockResolvedValueOnce([
				{
					id: "message-1",
					chatId: "chat-1",
					content: {
						type: "toolCallDisplay",
						value: {
							displayName: "Create FlashCard",
							displayDescriptionMarkdown: "Question",
							status: ToolCallStatus.Pending,
							fileId: "file-1",
							name: "",
							arguments: {},
						},
					},
				} as Message,
			])
			.mockResolvedValueOnce([
				{
					id: "message-1",
					chatId: "chat-1",
					content: {
						type: "toolCallDisplay",
						value: {
							displayName: "Create FlashCard",
							displayDescriptionMarkdown: "Question",
							fileId: "file-1",
							status: ToolCallStatus.Rejected,
							name: "",
							arguments: {},
						},
					},
				} as Message,
			]);

		renderComponent({
			preloadedState: {
				fileSystem: {
					errorMessage: "",
					successMessage: "",
					rootFolder: {
						files: [
							{
								id: "file-1",
							},
						],
					} as unknown as ReviewTreeFolderDto,
				},
			},
		});

		// Act

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));
		await userEvent.click(await screen.findByText("chat 1"));
		await userEvent.click(await screen.findByText("Reject"));
		await screen.findByText("Rejected");

		// Assert

		expect(vi.mocked(rejectToolCall)).toHaveBeenCalledWith("message-1");
	});

	it("Should be able to navigate to file", async () => {
		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			{
				id: "chat-1",
				title: "chat 1",
				createdDate: "date",
			},
		]);

		vi.mocked(getChatMessagesOrdered).mockResolvedValueOnce([
			{
				id: "message-1",
				chatId: "chat-1",
				content: {
					type: "toolCallDisplay",
					value: {
						displayName: "Create FlashCard",
						displayDescriptionMarkdown: "Question",
						status: ToolCallStatus.Pending,
						fileId: "file-1",
						name: "",
						arguments: {},
					},
				},
			} as Message,
		]);

		renderComponent({
			preloadedState: {
				fileSystem: {
					errorMessage: "",
					successMessage: "",
					rootFolder: {
						files: [
							{
								id: "file-1",
								name: "file 1",
							},
						],
					} as unknown as ReviewTreeFolderDto,
				},
			},
		});

		// Act

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));
		await userEvent.click(await screen.findByText("chat 1"));
		await userEvent.click(await screen.findByText("file 1"));

		// Assert

		expect(await getCurrentLocation()).toBe(
			`/editor?${FILE_ID_QUERY_PARAMETER}=file-1`,
		);
	});

	it("Should be able to upload a file", async () => {
		vi.mocked(getAllAiChatsSortedByDateDesc).mockResolvedValue([
			{
				id: "chat-1",
				title: "chat 1",
				createdDate: "date",
			},
		]);

		vi.mocked(getChatMessagesOrdered)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					id: "message-1",
					chatId: "chat-1",
					content: {
						type: "document",
						value: {
							fileName: "file 1 -- backend.pdf",
						},
					},
				} as Message,
			]);

		vi.mocked(open).mockResolvedValue("/home/file.pdf");

		vi.mocked(uploadDocument).mockImplementation(
			async () => await new Promise(resolve => setTimeout(resolve, 50)),
		);

		renderComponent({
			preloadedState: {
				fileSystem: {
					errorMessage: "",
					successMessage: "",
					rootFolder: {
						files: [
							{
								id: "file-1",
								name: "file 1",
							},
						],
					} as unknown as ReviewTreeFolderDto,
				},
			},
		});

		// Act

		await openChat();
		await userEvent.click(await screen.findByText("+ New chat"));
		await userEvent.click(await screen.findByText("chat 1"));
		await userEvent.click(await screen.findByTitle("Upload document"));
		// Showed temporary message to user.
		await screen.findByText("file.pdf");

		// Assert

		expect(vi.mocked(open)).toHaveBeenCalledOnce();
		expect(vi.mocked(uploadDocument)).toHaveBeenCalledWith(
			"/home/file.pdf",
			"chat-1",
		);

		// Waiting for upload to finish and verifying that retrieving the
		// files been executed.
		await new Promise(resolve => setTimeout(resolve, 50));
		await screen.findByText("file 1 -- backend.pdf");
	});
});
