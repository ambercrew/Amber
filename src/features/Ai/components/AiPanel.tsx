import { useEffect, useState } from "react";
import { ActionIcon, Alert, Group, Menu, Stack } from "@mantine/core";
import {
	DotsThreeVerticalIcon,
	PencilSimpleIcon,
	TrashIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import useAiChat from "../hooks/useAiChat";
import { buildDisplayMessages } from "../utils/buildDisplayMessages";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import ChatSelectMenu from "./ChatSelectMenu";
import RenameChatModal from "./RenameChatModal";
import DeleteChatModal from "./DeleteChatModal";

function AiPanel() {
	const {
		chats,
		selectedChatId,
		messages,
		pendingHumanText,
		streamingAssistantText,
		isStreaming,
		streamError,
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
	} = useAiChat();

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
					onClose={clearErrorMessage}
					title="Something went wrong">
					{errorMessage ?? streamError ?? ""}
				</Alert>
			)}

			<ChatMessages messages={displayMessages} />
			<ChatInput
				isStreaming={isStreaming}
				onSend={prompt => void sendPrompt(prompt)}
				onStop={() => void stopGeneration()}
				onUpload={path => void uploadDocumentToChat(path)}
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
