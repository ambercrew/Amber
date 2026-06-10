import Select from "../../../components/Select/Select";
import { Icon } from "@mdi/react";
import {
	mdiPencilOutline,
	mdiDeleteOutline,
	mdiClose,
	mdiDotsVertical,
} from "@mdi/js";
import styles from "./styles.module.css";
import Chat from "../../../api/aiIntegration/entities/chat";
import React, { useRef, useState } from "react";
import ActionsMenu, {
	Action,
} from "../../../components/ActionsMenu/ActionsMenu";
import useOutsideClick from "../../../hooks/useOutsideClick";
import useGlobalKey from "../../../hooks/useGlobalKey";

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
	const [showActionsMenu, setShowActionsMenu] = useState(false);
	const actionsContainerRef = useRef<HTMLDivElement>(null);

	useOutsideClick(actionsContainerRef as React.RefObject<HTMLElement>, () => {
		setShowActionsMenu(false);
	});

	useGlobalKey(e => {
		if (e.key === "Escape") setShowActionsMenu(false);
	});

	const handleSelectChangeValue = (newValue: string) => {
		if (newValue === NEW_SESSION_CHAT_ID) {
			onChangeSelectedChatId(null);
		} else {
			onChangeSelectedChatId(newValue);
		}
	};

	const actions: Action[] = [
		{
			iconName: mdiPencilOutline,
			text: "Rename chat",
			onClick: () => {
				setShowActionsMenu(false);
				onRenameClick();
			},
		},
		{
			iconName: mdiDeleteOutline,
			text: "Delete chat",
			onClick: () => {
				setShowActionsMenu(false);
				onDeleteClick();
			},
		},
	];

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
				className={styles.select}
			/>
			<div className="row">
				<div ref={actionsContainerRef}>
					<button
						className="transparent"
						title="Actions"
						disabled={selectedChatId === null}
						onClick={() => setShowActionsMenu(!showActionsMenu)}>
						<Icon path={mdiDotsVertical} size={1} />
					</button>
				</div>
				{showActionsMenu && (
					<ActionsMenu
						actions={actions}
						containerRef={actionsContainerRef}
						className={styles.actionsMenu}
						onHide={() => setShowActionsMenu(false)}
					/>
				)}
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
