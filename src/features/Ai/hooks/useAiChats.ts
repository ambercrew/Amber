import { useCallback, useRef, useState } from "react";
import {
	deleteAiChat,
	getAllAiChatsSortedByDateDesc,
	getChatMessagesOrdered,
	renameAiChat,
} from "../../../api/aiIntegration/api/aiApi";
import MessageDto from "../../../api/aiIntegration/dto/messageDto";
import ChatDto from "../../../api/aiIntegration/dto/chatDto";
import useApi from "../../../hooks/useApi";

/**
 * Owns the chat list, the selected chat, and its messages, plus the shared
 * `callApi`/loading/error state that `useAiStreaming` and
 * `useAiDocumentUpload` are handed so every AI action surfaces through the
 * same error state.
 */
export default function useAiChats() {
	const { callApi, isSendingRequest, errorMessage, clearErrorMessage } =
		useApi();

	const [chats, setChats] = useState<ChatDto[]>([]);
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const [messages, setMessages] = useState<MessageDto[]>([]);

	// The streaming/upload callbacks close over the chat id at the time the
	// request was sent; a `createdChat` event or a first upload can change
	// the active chat mid-request, so it's kept in a ref (shared with those
	// hooks) rather than relying on the possibly-stale selectedChatId.
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

	return {
		chats,
		setChats,
		selectedChatId,
		setSelectedChatId,
		messages,
		setMessages,
		activeChatIdRef,
		callApi,
		isSendingRequest,
		errorMessage,
		clearErrorMessage,
		refreshChats,
		openChat,
		startNewChat,
		removeChat,
		renameChat,
	};
}
