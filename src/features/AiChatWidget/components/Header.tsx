import Select from "../../../components/Select/Select";
import { Icon } from "@mdi/react";
import { mdiPencilOutline, mdiDeleteOutline, mdiClose } from "@mdi/js";
import styles from "./styles.module.css";
import Chat from "../../../api/aiIntegration/entities/chat";

interface Props {
	selectedChatId: string | null;
	chats: Chat[];
	onChangeSelectedChatId: (newId: string | null) => void;
	onDeleteClick: () => void;
	onRenameClick: () => void;
	onClose: () => void;
}

const NEW_SESSION_CHAT_ID = "new-chat";

export default function Header({
	selectedChatId,
	chats,
	onChangeSelectedChatId,
	onDeleteClick,
	onRenameClick,
	onClose,
}: Props) {
	const handleSelectChangeValue = (newValue: string) => {
		if (newValue === NEW_SESSION_CHAT_ID) {
			onChangeSelectedChatId(null);
		} else {
			onChangeSelectedChatId(newValue);
		}
	};

	return (
		<div className={styles.header}>
			<Select
				onChangeValue={handleSelectChangeValue}
				currentValue={selectedChatId ?? NEW_SESSION_CHAT_ID}
				options={[
					{
						value: NEW_SESSION_CHAT_ID,
						label: "+ New chat",
					},
					...chats.map(chat => ({
						value: chat.id,
						label: chat.title,
					})),
				]}
			/>
			<div className="row">
				<button
					onClick={onRenameClick}
					className="transparent"
					title="Rename chat"
					disabled={selectedChatId === null}>
					<Icon path={mdiPencilOutline} size={1} />
				</button>
				<button
					onClick={onDeleteClick}
					className="transparent"
					title="Delete chat"
					disabled={selectedChatId === null}>
					<Icon path={mdiDeleteOutline} size={1} />
				</button>
				<button
					onClick={onClose}
					className="transparent"
					title="Close chat (Ctrl + J)">
					<Icon path={mdiClose} size={1} />
				</button>
			</div>
		</div>
	);
}
