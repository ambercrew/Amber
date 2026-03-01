import Select from "../../../components/Select/Select";
import Icon from "@mdi/react";
import { mdiPencilOutline, mdiDeleteOutline, mdiClose } from "@mdi/js";
import styles from "./styles.module.css";
import Chat from "../../../types/backend/entity/chat";
import { NEW_SESSION_CHAT_ID } from "../config/constants";

interface Props {
	selectedChatId: string;
	chats: Chat[];
	onChangeSelectedChatId: (newId: string) => void;
	onDeleteClick: () => void;
	onRenameClick: () => void;
	onClose: () => void;
}

export default function Header({
	selectedChatId,
	chats,
	onChangeSelectedChatId,
	onDeleteClick,
	onRenameClick,
	onClose,
}: Props) {
	return (
		<div className={styles.header}>
			<Select
				onChangeValue={onChangeSelectedChatId}
				currentValue={selectedChatId}
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
					disabled={selectedChatId === NEW_SESSION_CHAT_ID}>
					<Icon path={mdiPencilOutline} size={1} />
				</button>
				<button
					onClick={onDeleteClick}
					className="transparent"
					title="Delete chat"
					disabled={selectedChatId === NEW_SESSION_CHAT_ID}>
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
