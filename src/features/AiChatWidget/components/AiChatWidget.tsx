import Icon from "@mdi/react";
import {
	mdiAttachment,
	mdiClose,
	mdiDeleteOutline,
	mdiPencilOutline,
	mdiRobotOutline,
	mdiSendVariantOutline,
	mdiStopCircleOutline,
} from "@mdi/js";
import styles from "./styles.module.css";
import { useEffect, useRef, useState } from "react";
import { Channel } from "@tauri-apps/api/core";
import { StreamLlmResponseEvent } from "../../../types/backend/events/streamLlmResponseEvent";
import {
	deleteAiChat,
	getAllAiChatsSortedByDateDesc,
	getChatMessagesOrdered,
	renameAiChat,
	stopAiGeneration,
	streamAiResponse,
} from "../../../api/aiApi";
import Message from "../types/message";
import Markdown from "react-markdown";
import errorToString from "../../../utils/errorToString";
import Alert from "../../../components/Alert/Alert";
import { AUTO_SCROLL_THRESHOLD } from "../config/constants";
import Select from "../../../components/Select/Select";
import Chat from "../../../types/backend/entity/chat";
import ConfirmationDialog from "../../../components/ConfirmationDialog/ConfirmationDialog";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";
import useGlobalKey from "../../../hooks/useGlobalKey";
import Dialog from "../../../components/Dialog/Dialog";
import Form, {
	FormButtons,
	FormHeader,
	FormRows,
} from "../../../components/Form/Form";

export default function AiChatWidget() {
	const settings = useAppSelector(selectSettings);
	return settings?.enableAi ? <AiChatWidgetInner /> : null;
}

const NEW_SESSION_VALUE = "new-session";

function AiChatWidgetInner() {
	const [isOpen, setIsOpen] = useState(false);
	const [showDeleteChatDialog, setShowDeleteChatDialog] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [showRenameDialog, setShowRenameDialog] = useState(false);
	const [userPrompt, setUserPrompt] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isStreamingResponse, setIsStreamingResponse] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [chats, setChats] = useState<Chat[]>([]);
	const [selectedChatId, setSelectedChatId] =
		useState<string>(NEW_SESSION_VALUE);
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
	const messagesContainerRef = useRef<HTMLDivElement | null>(null);

	useGlobalKey(e => {
		if (e.ctrlKey && e.key.toLowerCase() === "j") {
			setIsOpen(isOpen => !isOpen);
		}
	});

	const handleChangeSelectedChatId = async (newChatId: string) => {
		if (newChatId !== selectedChatId) {
			setErrorMessage("");
			await stopAiGeneration();
		}

		if (newChatId === NEW_SESSION_VALUE) {
			setMessages([]);
		} else {
			setMessages(await getChatMessagesOrdered(newChatId));
		}
		setSelectedChatId(newChatId);
	};

	const sendMessage = async () => {
		if (!userPrompt || isStreamingResponse) return;

		setErrorMessage("");
		setIsStreamingResponse(true);
		setMessages(messages => [
			...messages,
			{
				chatId: selectedChatId ?? "tmp",
				id: "tmp",
				role: "human",
				content: userPrompt,
			},
			{
				chatId: selectedChatId ?? "tmp",
				id: "tmp",
				role: "assistant",
				content: "",
			},
		]);

		const onEvent = new Channel<StreamLlmResponseEvent>();
		// Using a custom variable since the variable can be updated under stream
		// while the state is still queued for update.
		let updatedChatId = selectedChatId;
		onEvent.onmessage = event => {
			if (event.event === "createdChat") {
				setChats(chats => {
					let newValue = chats;
					if (!newValue.some(chat => chat.id === event.data.id)) {
						newValue = [event.data, ...chats];
					}
					return newValue;
				});
				setSelectedChatId(event.data.id);
				updatedChatId = event.data.id;
			} else if (event.event === "inProgress") {
				setMessages(messages => {
					const lastMessage = messages[messages.length - 1];
					return [
						...messages.slice(0, -1),
						{
							...lastMessage,
							content: lastMessage.content + event.data,
						},
					];
				});
			} else if (event.event === "finished") {
				setIsStreamingResponse(false);
			} else if (event.event === "error") {
				setErrorMessage(event.data);
			}
		};
		setUserPrompt("");

		try {
			await streamAiResponse(
				userPrompt,
				selectedChatId === NEW_SESSION_VALUE ? null : selectedChatId,
				onEvent,
			);
		} catch (e) {
			setErrorMessage(errorToString(e));
			setIsStreamingResponse(false);
		} finally {
			setMessages(await getChatMessagesOrdered(updatedChatId));
		}
	};

	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault();
		void sendMessage();
	};

	const handleTextAreaKeyDown = (
		e: React.KeyboardEvent<HTMLTextAreaElement>,
	) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			void sendMessage();
		} else if (e.key === "Escape") {
			setIsOpen(false);
		}
	};

	useEffect(() => {
		if (textAreaRef.current) {
			textAreaRef.current.style.height = "auto";
			textAreaRef.current.style.height =
				textAreaRef.current.scrollHeight + "px";
		}
	}, [userPrompt]);

	useEffect(() => {
		if (!messagesContainerRef.current) return;

		const container = messagesContainerRef.current;

		const position = container.scrollTop + container.clientHeight;
		if (container.scrollHeight - position < AUTO_SCROLL_THRESHOLD) {
			container.scrollTop = container.scrollHeight;
		}
	}, [messages]);

	useEffect(() => {
		void (async () => {
			setChats(await getAllAiChatsSortedByDateDesc());
		})();

		return () => {
			void stopAiGeneration();
		};
	}, []);

	useEffect(() => {
		if (!messagesContainerRef.current) return;
		messagesContainerRef.current.scrollTop =
			messagesContainerRef.current.scrollHeight;
	}, [selectedChatId]);

	const handleDelete = async () => {
		await deleteAiChat(selectedChatId);
		await handleChangeSelectedChatId(NEW_SESSION_VALUE);
		setErrorMessage("");
		setShowDeleteChatDialog(false);
		setChats(await getAllAiChatsSortedByDateDesc());
	};

	const handleRenameSubmit = async (e: React.SubmitEvent) => {
		e.stopPropagation();
		e.preventDefault();
		setShowRenameDialog(false);

		try {
			await renameAiChat(selectedChatId, newTitle);
			setChats(await getAllAiChatsSortedByDateDesc());
		} catch (e) {
			setErrorMessage(errorToString(e));
		}
	};

	const handleShowRenameDialog = () => {
		setShowRenameDialog(true);
		const chat = chats.find(c => c.id === selectedChatId)!;
		setNewTitle(chat.title);
	};

	return (
		<>
			{showDeleteChatDialog && (
				<ConfirmationDialog
					title="Delete chat"
					text="Are you sure you want to delete the selected chat"
					icon={mdiDeleteOutline}
					onCancel={() => setShowDeleteChatDialog(false)}
					onConfirm={() => void handleDelete()}
				/>
			)}

			{showRenameDialog && (
				<Dialog
					focusTrap={true}
					className={styles.renameDialog}
					onHide={() => setShowRenameDialog(false)}>
					<Form onSubmit={e => void handleRenameSubmit(e)}>
						<FormHeader
							icon={mdiPencilOutline}
							title="Enter new name"
						/>
						<FormRows
							rows={[
								{
									children: (
										<input
											type="text"
											id="new-name"
											value={newTitle}
											onChange={e =>
												setNewTitle(e.target.value)
											}
											required
											autoFocus
										/>
									),
									labelHtmlFor: "new-name",
								},
							]}
						/>
						<FormButtons
							onClose={() => setShowRenameDialog(false)}
							submitText="Rename"
						/>
					</Form>
				</Dialog>
			)}

			<div className={styles.container}>
				{isOpen && (
					<div className={styles.chatPanel}>
						<div className={styles.header}>
							<Select
								onChangeValue={value =>
									void handleChangeSelectedChatId(value)
								}
								currentValue={selectedChatId}
								options={[
									{
										value: NEW_SESSION_VALUE,
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
									onClick={handleShowRenameDialog}
									className="transparent"
									title="Rename chat"
									disabled={
										selectedChatId === NEW_SESSION_VALUE
									}>
									<Icon path={mdiPencilOutline} size={1} />
								</button>
								<button
									onClick={() =>
										setShowDeleteChatDialog(true)
									}
									className="transparent"
									title="Delete chat"
									disabled={
										selectedChatId === NEW_SESSION_VALUE
									}>
									<Icon path={mdiDeleteOutline} size={1} />
								</button>
								<button
									onClick={() => setIsOpen(false)}
									className="transparent"
									title="Close chat (Ctrl + J)">
									<Icon path={mdiClose} size={1} />
								</button>
							</div>
						</div>

						<div
							className={styles.messages}
							ref={messagesContainerRef}
							data-testid="messages-container">
							{messages.map((message, i) => (
								<div
									key={i}
									className={`${styles.message} ${styles[message.role]}`}>
									<Markdown>{message.content}</Markdown>
									{isStreamingResponse &&
										i === messages.length - 1 && (
											<div
												className={
													styles.spinner
												}></div>
										)}
								</div>
							))}

							{errorMessage && (
								<Alert
									type="error"
									onClose={() => setErrorMessage("")}>
									{errorMessage}
								</Alert>
							)}
						</div>

						<form onSubmit={handleSubmit}>
							<textarea
								ref={textAreaRef}
								placeholder="Type here to speak with AI"
								value={userPrompt}
								onChange={e => setUserPrompt(e.target.value)}
								onKeyDown={handleTextAreaKeyDown}
								rows={1}
								autoFocus
							/>
							<button
								className="transparent"
								title="Add attachment">
								<Icon path={mdiAttachment} size={1} />
							</button>
							{!isStreamingResponse && (
								<button className="transparent" title="Send">
									<Icon
										path={mdiSendVariantOutline}
										size={1}
									/>
								</button>
							)}

							{isStreamingResponse && (
								<button
									className="transparent"
									title="Stop"
									onClick={() => void stopAiGeneration()}>
									<Icon
										path={mdiStopCircleOutline}
										size={1}
									/>
								</button>
							)}
						</form>
					</div>
				)}

				{!isOpen && (
					<button
						className={`primary ${styles.floatingButton}`}
						onClick={() => setIsOpen(true)}
						title="Open AI assistant (Ctrl + J)">
						<Icon path={mdiRobotOutline} size={1.6} />
					</button>
				)}
			</div>
		</>
	);
}
