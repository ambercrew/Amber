import {
	Dispatch,
	RefObject,
	SetStateAction,
	useCallback,
	useState,
} from "react";
import {
	createAiChat,
	getChatMessagesOrdered,
	uploadDocument,
} from "../../../api/aiIntegration/api/aiApi";
import MessageDto from "../../../api/aiIntegration/dto/messageDto";
import ChatDto from "../../../api/aiIntegration/dto/chatDto";
import { CallApiFn } from "../../../hooks/useApi";

interface UseAiDocumentUploadParams {
	selectedChatId: string | null;
	setSelectedChatId: Dispatch<SetStateAction<string | null>>;
	setChats: Dispatch<SetStateAction<ChatDto[]>>;
	setMessages: Dispatch<SetStateAction<MessageDto[]>>;
	activeChatIdRef: RefObject<string | null>;
	callApi: CallApiFn;
}

/** Uploads a document to the chat managed by `useAiChats`, creating one first if none is selected. */
export default function useAiDocumentUpload({
	selectedChatId,
	setSelectedChatId,
	setChats,
	setMessages,
	activeChatIdRef,
	callApi,
}: UseAiDocumentUploadParams) {
	const [isUploading, setIsUploading] = useState(false);
	const [pendingDocumentFileName, setPendingDocumentFileName] = useState<
		string | null
	>(null);
	// Which chat the in-flight upload belongs to, so its pending message is
	// only shown while that chat is the one open.
	const [uploadChatId, setUploadChatId] = useState<string | null>(null);

	const uploadDocumentToChat = useCallback(
		async (path: string) => {
			const fileName = path.split(/[/\\]/).pop() ?? path;
			setIsUploading(true);
			setPendingDocumentFileName(fileName);
			setUploadChatId(selectedChatId);

			await callApi(
				async () => {
					let chatId = selectedChatId;
					if (!chatId) {
						const chat = await createAiChat(fileName);
						chatId = chat.id;
						activeChatIdRef.current = chat.id;
						setSelectedChatId(chat.id);
						setUploadChatId(chat.id);
						setChats(prev => [chat, ...prev]);
					}

					await uploadDocument(path, chatId);
					const msgs = await getChatMessagesOrdered(chatId);
					// Only apply the refreshed messages if the user hasn't
					// since switched to a different chat, otherwise this
					// would overwrite whatever chat is now being viewed.
					if (chatId === activeChatIdRef.current) {
						setMessages(msgs);
					}
				},
				() => {
					setIsUploading(false);
					setPendingDocumentFileName(null);
					setUploadChatId(null);
					return Promise.resolve();
				},
			);
		},
		[
			activeChatIdRef,
			callApi,
			selectedChatId,
			setChats,
			setMessages,
			setSelectedChatId,
		],
	);

	// Same idea as streaming's pending text: only surface it while the chat
	// it belongs to is the one open.
	const isViewingUploadChat = uploadChatId === selectedChatId;

	return {
		isUploading,
		pendingDocumentFileName: isViewingUploadChat
			? pendingDocumentFileName
			: null,
		uploadDocumentToChat,
	};
}
