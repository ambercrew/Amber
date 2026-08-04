import { useEffect, useState } from "react";
import { ActionIcon, Alert, Group, Menu, Stack } from "@mantine/core";
import {
	DotsThreeVerticalIcon,
	PencilSimpleIcon,
	TrashIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import useAiChats from "../hooks/useAiChats";
import useAiStreaming from "../hooks/useAiStreaming";
import useAiDocumentUpload from "../hooks/useAiDocumentUpload";
import { buildDisplayMessages } from "../utils/buildDisplayMessages";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectCurrentElement } from "../../../stores/elements/elementsSelectors";
import { selectAiContextSnippets } from "../../../stores/aiContext/aiContextSelectors";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatSelectMenu from "./ChatSelectMenu";
import RenameChatModal from "./RenameChatModal";
import DeleteChatModal from "./DeleteChatModal";
import AiContextSnippets from "./AiContextSnippets";

function AiPanel() {
	const currentElementId =
		useAppSelector(selectCurrentElement)?.data.meta.elementId ?? null;
	const contextSnippets = useAppSelector(selectAiContextSnippets).map(
		snippet => snippet.text,
	);

	const {
		chats,
		setChats,
		selectedChatId,
		setSelectedChatId,
		messages,
		setMessages,
		activeChatIdRef,
		callApi,
		errorMessage,
		clearErrorMessage,
		refreshChats,
		openChat,
		startNewChat,
		removeChat,
		renameChat,
	} = useAiChats();

	const {
		pendingHumanText,
		streamingAssistantText,
		isStreaming,
		streamError,
		clearStreamError,
		failedPrompt,
		restoreKey,
		sendPrompt,
		stopGeneration,
	} = useAiStreaming({
		selectedChatId,
		setSelectedChatId,
		setChats,
		setMessages,
		activeChatIdRef,
		refreshChats,
		callApi,
		currentElementId,
		contextSnippets,
	});

	const { isUploading, pendingDocumentFileName, uploadDocumentToChat } =
		useAiDocumentUpload({
			selectedChatId,
			setSelectedChatId,
			setChats,
			setMessages,
			activeChatIdRef,
			callApi,
		});

	const [isRenaming, setIsRenaming] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const selectedChat = chats.find(chat => chat.id === selectedChatId);

	useEffect(() => {
		void refreshChats();
		// Only re-fetch on mount, not on every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const displayMessages = buildDisplayMessages(
		messages,
		pendingHumanText,
		streamingAssistantText,
		pendingDocumentFileName,
	);

	return (
		<Stack gap={0} h="100%" style={{ flex: 1, minHeight: 0 }}>
			<Group justify="space-between" pb="xs" gap="xs" wrap="nowrap">
				<ChatSelectMenu
					chats={chats}
					selectedChatId={selectedChatId}
					onSelect={id => void openChat(id)}
					onNewChat={startNewChat}
				/>
				<Menu position="bottom-end" width={180}>
					<Menu.Target>
						<ActionIcon
							variant="subtle"
							size="lg"
							aria-label="Chat actions">
							<DotsThreeVerticalIcon size={18} weight="bold" />
						</ActionIcon>
					</Menu.Target>

					<Menu.Dropdown>
						<Menu.Item
							leftSection={<PencilSimpleIcon size={14} />}
							disabled={!selectedChat}
							onClick={() => setIsRenaming(true)}>
							Rename chat
						</Menu.Item>
						<Menu.Item
							color="red"
							leftSection={<TrashIcon size={14} />}
							disabled={!selectedChat}
							onClick={() => setIsDeleting(true)}>
							Delete chat
						</Menu.Item>
					</Menu.Dropdown>
				</Menu>
			</Group>

			{(errorMessage ?? streamError) && (
				<Alert
					color="red"
					icon={<WarningIcon size={16} />}
					mb="xs"
					withCloseButton
					onClose={() => {
						clearErrorMessage();
						clearStreamError();
					}}
					title="Something went wrong">
					{errorMessage ?? streamError ?? ""}
				</Alert>
			)}

			<ChatMessages messages={displayMessages} />
			<AiContextSnippets />
			<ChatInput
				key={restoreKey}
				isStreaming={isStreaming}
				isUploading={isUploading}
				onSend={prompt => void sendPrompt(prompt)}
				onStop={() => void stopGeneration()}
				onUpload={path => void uploadDocumentToChat(path)}
				initialValue={failedPrompt ?? undefined}
			/>

			{selectedChat && (
				<RenameChatModal
					key={selectedChat.id}
					opened={isRenaming}
					initialTitle={selectedChat.title}
					onClose={() => setIsRenaming(false)}
					onConfirm={title => void renameChat(selectedChat.id, title)}
				/>
			)}

			<DeleteChatModal
				opened={isDeleting}
				onClose={() => setIsDeleting(false)}
				onConfirm={() => {
					if (selectedChatId) void removeChat(selectedChatId);
				}}
			/>
		</Stack>
	);
}

export default AiPanel;
