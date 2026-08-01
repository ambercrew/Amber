import { useCallback, useRef, useState } from "react";
import { Channel } from "@tauri-apps/api/core";
import {
	createAiChat,
	deleteAiChat,
	getAllAiChatsSortedByDateDesc,
	getChatMessagesOrdered,
	renameAiChat,
	stopAiGeneration,
	streamAiResponse,
	uploadDocument,
} from "../../../api/aiIntegration/api/aiApi";
import StreamLlmResponseEventDto from "../../../api/aiIntegration/dto/streamLlmResponseEventDto";
import MessageDto from "../../../api/aiIntegration/dto/messageDto";
import ChatDto from "../../../api/aiIntegration/dto/chatDto";
import useApi from "../../../hooks/useApi";

export default function useAiChat() {
	const { callApi, isSendingRequest, errorMessage, clearErrorMessage } =
		useApi();

	const [chats, setChats] = useState<ChatDto[]>([]);
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const [messages, setMessages] = useState<MessageDto[]>([]);
	const [pendingHumanText, setPendingHumanText] = useState<string | null>(
		null,
	);
	const [streamingAssistantText, setStreamingAssistantText] = useState<
		string | null
	>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamError, setStreamError] = useState<string | null>(null);

	// The channel callback closes over the chat id at the time the request
	// was sent; a `createdChat` event can update it mid-stream, so it is kept
	// in a ref rather than relying on the (possibly stale) selectedChatId.
	const activeChatIdRef = useRef<string | null>(null);

	const refreshChats = useCallback(async () => {
		await callApi(async () => {
			setChats(await getAllAiChatsSortedByDateDesc());
		});
	}, [callApi]);

	const openChat = useCallback(
		async (chatId: string) => {
			await callApi(async () => {
				setSelectedChatId(chatId);
				activeChatIdRef.current = chatId;
				const msgs = await getChatMessagesOrdered(chatId);
				setMessages(msgs);
			});
		},
		[callApi],
	);

	const startNewChat = useCallback(() => {
		setSelectedChatId(null);
		activeChatIdRef.current = null;
		setMessages([]);
	}, []);

	const removeChat = useCallback(
		async (chatId: string) => {
			await callApi(async () => {
				await deleteAiChat(chatId);
				setChats(prev => prev.filter(c => c.id !== chatId));
				if (selectedChatId === chatId) startNewChat();
			});
		},
		[callApi, selectedChatId, startNewChat],
	);

	const renameChat = useCallback(
		async (chatId: string, newTitle: string) => {
			await callApi(async () => {
				await renameAiChat(chatId, newTitle);
				setChats(prev =>
					prev.map(c =>
						c.id === chatId ? { ...c, title: newTitle } : c,
					),
				);
			});
		},
		[callApi],
	);

	const sendPrompt = useCallback(
		async (prompt: string) => {
			setStreamError(null);
			setPendingHumanText(prompt);
			setStreamingAssistantText("");
			setIsStreaming(true);
			activeChatIdRef.current = selectedChatId;

			const channel = new Channel<StreamLlmResponseEventDto>();
			channel.onmessage = event => {
				if (event.event === "createdChat") {
					activeChatIdRef.current = event.data.id;
					setSelectedChatId(event.data.id);
					setChats(prev => [event.data, ...prev]);
				} else if (event.event === "inProgress") {
					setStreamingAssistantText(
						prev => (prev ?? "") + event.data,
					);
				} else if (event.event === "error") {
					setStreamError(event.data);
				}
			};

			await callApi(
				async () => {
					await streamAiResponse(channel, {
						prompt,
						chatId: selectedChatId,
					});
				},
				async () => {
					setIsStreaming(false);
					setPendingHumanText(null);
					setStreamingAssistantText(null);

					const chatId = activeChatIdRef.current;
					if (chatId) {
						const msgs = await getChatMessagesOrdered(chatId);
						setMessages(msgs);
					}
					await refreshChats();
				},
			);
		},
		[callApi, refreshChats, selectedChatId],
	);

	const stopGeneration = useCallback(async () => {
		await stopAiGeneration();
	}, []);

	const uploadDocumentToChat = useCallback(
		async (path: string) => {
			await callApi(async () => {
				let chatId = selectedChatId;
				if (!chatId) {
					const fileName = path.split(/[/\\]/).pop() ?? path;
					const chat = await createAiChat(fileName);
					chatId = chat.id;
					activeChatIdRef.current = chat.id;
					setSelectedChatId(chat.id);
					setChats(prev => [chat, ...prev]);
				}

				await uploadDocument(path, chatId);
				const msgs = await getChatMessagesOrdered(chatId);
				setMessages(msgs);
			});
		},
		[callApi, selectedChatId],
	);

	return {
		chats,
		selectedChatId,
		messages,
		pendingHumanText,
		streamingAssistantText,
		isStreaming,
		streamError,
		isSendingRequest,
		errorMessage,
		clearErrorMessage,
		refreshChats,
		openChat,
		startNewChat,
		removeChat,
		renameChat,
		sendPrompt,
		stopGeneration,
		uploadDocumentToChat,
	};
}
