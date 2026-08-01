import { Group, Select, Text } from "@mantine/core";
import { CheckIcon, PlusIcon } from "@phosphor-icons/react";
import ChatDto from "../../../api/aiIntegration/dto/chatDto";

const NEW_CHAT_VALUE = "__new_chat__";

interface ChatSelectMenuProps {
	chats: ChatDto[];
	selectedChatId: string | null;
	onSelect: (chatId: string) => void;
	onNewChat: () => void;
}

function ChatSelectMenu({
	chats,
	selectedChatId,
	onSelect,
	onNewChat,
}: ChatSelectMenuProps) {
	return (
		<Select
			data={[
				{ value: NEW_CHAT_VALUE, label: "New chat" },
				...chats.map(chat => ({ value: chat.id, label: chat.title })),
			]}
			value={selectedChatId ?? NEW_CHAT_VALUE}
			onChange={value => {
				if (!value) return;
				if (value === NEW_CHAT_VALUE) onNewChat();
				else onSelect(value);
			}}
			allowDeselect={false}
			renderOption={({ option, checked }) => (
				<Group flex="1" gap="xs" wrap="nowrap">
					{option.value !== NEW_CHAT_VALUE && (
						<CheckIcon
							size={14}
							style={{
								visibility: checked ? "visible" : "hidden",
							}}
						/>
					)}
					{option.value === NEW_CHAT_VALUE && <PlusIcon size={14} />}
					<Text size="sm" truncate style={{ flex: 1 }}>
						{option.label}
					</Text>
				</Group>
			)}
			style={{ flex: 1, minWidth: 0 }}
		/>
	);
}

export default ChatSelectMenu;
