import {
	Dispatch,
	RefObject,
	SetStateAction,
	useCallback,
	useState,
} from "react";
import { Channel } from "@tauri-apps/api/core";
import {
	getChatMessagesOrdered,
	stopAiGeneration,
	streamAiResponse,
} from "../../../api/aiIntegration/api/aiApi";
import StreamLlmResponseEventDto from "../../../api/aiIntegration/dto/streamLlmResponseEventDto";
import MessageDto from "../../../api/aiIntegration/dto/messageDto";
import ChatDto from "../../../api/aiIntegration/dto/chatDto";
import { CallApiFn } from "../../../hooks/useApi";

interface UseAiStreamingParams {
	selectedChatId: string | null;
	setSelectedChatId: Dispatch<SetStateAction<string | null>>;
	setChats: Dispatch<SetStateAction<ChatDto[]>>;
	setMessages: Dispatch<SetStateAction<MessageDto[]>>;
	activeChatIdRef: RefObject<string | null>;
	refreshChats: () => Promise<void>;
	callApi: CallApiFn;
}

/** Sends prompts and streams the assistant's response for the chat managed by `useAiChats`. */
export default function useAiStreaming({
	selectedChatId,
	setSelectedChatId,
	setChats,
	setMessages,
	activeChatIdRef,
	refreshChats,
	callApi,
}: UseAiStreamingParams) {
	const [pendingHumanText, setPendingHumanText] = useState<string | null>(
		null,
	);
	const [streamingAssistantText, setStreamingAssistantText] = useState<
		string | null
	>(null);
	const [isStreaming, setIsStreaming] = useState(false);
	const [streamError, setStreamError] = useState<string | null>(null);
	const [failedPrompt, setFailedPrompt] = useState<string | null>(null);
	const [restoreKey, setRestoreKey] = useState(0);
	// Which chat the in-flight generation belongs to, so its pending human
	// prompt / streaming text is only shown while that chat is the one open.
	const [streamChatId, setStreamChatId] = useState<string | null>(null);

	const sendPrompt = useCallback(
		async (prompt: string) => {
			setStreamError(null);
			setPendingHumanText(prompt);
			setStreamingAssistantText("");
			setIsStreaming(true);
			activeChatIdRef.current = selectedChatId;
			setStreamChatId(selectedChatId);

			// Read synchronously in `onFinally` below, since state set from
			// the channel handler or the catch block hasn't re-rendered yet
			// by the time `onFinally` runs.
			let failed = false;

			const channel = new Channel<StreamLlmResponseEventDto>();
			channel.onmessage = event => {
				if (event.event === "createdChat") {
					activeChatIdRef.current = event.data.id;
					setSelectedChatId(event.data.id);
					setStreamChatId(event.data.id);
					setChats(prev => [event.data, ...prev]);
				} else if (event.event === "inProgress") {
					setStreamChatId(event.data.chatId);
					setStreamingAssistantText(
						prev => (prev ?? "") + event.data.text,
					);
				} else if (event.event === "error") {
					failed = true;
					setStreamError(event.data);
				}
			};

			await callApi(
				async () => {
					try {
						await streamAiResponse(channel, {
							prompt,
							chatId: selectedChatId,
						});
					} catch (e) {
						failed = true;
						throw e;
					}
				},
				async () => {
					setIsStreaming(false);
					setPendingHumanText(null);
					setStreamingAssistantText(null);
					setStreamChatId(null);
					if (failed) {
						setFailedPrompt(prompt);
						setRestoreKey(k => k + 1);
					}

					const chatId = activeChatIdRef.current;
					if (chatId) {
						const msgs = await getChatMessagesOrdered(chatId);
						setMessages(msgs);
					}
					await refreshChats();
				},
			);
		},
		[
			activeChatIdRef,
			callApi,
			refreshChats,
			selectedChatId,
			setChats,
			setMessages,
			setSelectedChatId,
		],
	);

	const clearStreamError = useCallback(() => setStreamError(null), []);

	const stopGeneration = useCallback(async () => {
		await stopAiGeneration();
	}, []);

	// The in-flight generation's pending prompt/streaming text belongs to
	// whichever chat it was sent to; only surface it while that chat is open.
	const isViewingStreamChat = streamChatId === selectedChatId;

	return {
		pendingHumanText: isViewingStreamChat ? pendingHumanText : null,
		streamingAssistantText: isViewingStreamChat
			? streamingAssistantText
			: null,
		isStreaming,
		streamError,
		clearStreamError,
		failedPrompt,
		restoreKey,
		sendPrompt,
		stopGeneration,
	};
}
