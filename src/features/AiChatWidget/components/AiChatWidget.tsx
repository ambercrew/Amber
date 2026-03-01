import Icon from "@mdi/react";
import { mdiDeleteOutline, mdiRobotOutline } from "@mdi/js";
import styles from "./styles.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Channel } from "@tauri-apps/api/core";
import { StreamLlmResponseEvent } from "../../../types/backend/events/streamLlmResponseEvent";
import {
	deleteAiChat,
	getAllAiChatsSortedByDateDesc,
	getChatMessagesOrdered,
	renameAiChat,
	stopAiGeneration as stopAiGenerationApi,
	streamAiResponse,
} from "../../../api/aiApi";
import Message, {
	MessageContentHumanAssistant,
} from "../../../types/backend/entity/message";
import errorToString from "../../../utils/errorToString";
import {
	NEW_SESSION_CHAT_ID,
	TEMP_ASSISTANT_MESSAGE_ID,
} from "../config/constants";
import Chat from "../../../types/backend/entity/chat";
import ConfirmationDialog from "../../../components/ConfirmationDialog/ConfirmationDialog";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { useSearchParams } from "react-router";
import { FILE_ID_QUERY_PARAMETER } from "../../../config/constants";
import Header from "./Header";
import RenameDialog from "./RenameDialog";
import Messages from "./Messages";
import PromptForm from "./PromptForm";

export default function AiChatWidget() {
	const settings = useAppSelector(selectSettings);
	return settings?.enableAi ? <AiChatWidgetInner /> : null;
}

function AiChatWidgetInner() {
	const [isOpen, setIsOpen] = useState(false);
	const [showDeleteChatDialog, setShowDeleteChatDialog] = useState(false);
	const [showRenameDialog, setShowRenameDialog] = useState(false);
	const [userPrompt, setUserPrompt] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [isStreamingResponse, setIsStreamingResponse] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [chats, setChats] = useState<Chat[]>([]);
	const [selectedChatId, setSelectedChatId] =
		useState<string>(NEW_SESSION_CHAT_ID);
	// Used to have reference to the same selected chat id, useful for streaming.
	const selectedChatIdRef = useRef(selectedChatId);
	const [searchParams] = useSearchParams();
	const selectedFileId = searchParams.get(FILE_ID_QUERY_PARAMETER);

	useEffect(() => {
		selectedChatIdRef.current = selectedChatId;
	}, [selectedChatId]);

	useGlobalKey(e => {
		if (e.ctrlKey && e.key.toLowerCase() === "j") {
			e.preventDefault();
			setIsOpen(isOpen => !isOpen);
		}
	}, "keydown");

	const stopAiGeneration = useCallback(async () => {
		await stopAiGenerationApi();
		setIsStreamingResponse(false);
	}, []);

	const handleChangeSelectedChatId = async (newChatId: string) => {
		if (newChatId !== selectedChatId) {
			setErrorMessage("");
			setSelectedChatId(newChatId);
			await stopAiGeneration();
		}

		if (newChatId === NEW_SESSION_CHAT_ID) {
			setMessages([]);
		} else {
			setMessages(await getChatMessagesOrdered(newChatId));
		}
	};

	const sendMessage = async () => {
		if (!userPrompt.trim() || isStreamingResponse) return;

		setErrorMessage("");
		setIsStreamingResponse(true);
		setMessages(messages => [
			...messages,
			{
				chatId: selectedChatId ?? "tmp",
				id: "tmp",
				content: {
					type: "human",
					value: userPrompt,
				},
			},
			{
				chatId: selectedChatId ?? "tmp",
				id: TEMP_ASSISTANT_MESSAGE_ID,
				contentType: "assistant",
				content: {
					type: "assistant",
					value: "",
				},
			},
		]);

		const onEvent = new Channel<StreamLlmResponseEvent>();
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
			} else if (event.event === "inProgress") {
				setMessages(messages => {
					const tempAssistantMessage = messages.find(
						m => m.id === TEMP_ASSISTANT_MESSAGE_ID,
					)!;

					return [
						...messages.filter(
							m => m.id !== TEMP_ASSISTANT_MESSAGE_ID,
						),
						{
							...tempAssistantMessage,
							content: {
								...tempAssistantMessage.content,
								value:
									(tempAssistantMessage.content
										.value as string) + event.data,
							} as MessageContentHumanAssistant,
						},
					];
				});
			} else if (event.event === "error") {
				setErrorMessage(event.data);
			} else if (event.event === "toolCalled") {
				setMessages(messages => {
					const tempAssistantMessage = messages.find(
						m => m.id === TEMP_ASSISTANT_MESSAGE_ID,
					)!;

					return [
						...messages.filter(
							m => m.id !== TEMP_ASSISTANT_MESSAGE_ID,
						),
						event.data,
						tempAssistantMessage,
					];
				});
			}
		};
		setUserPrompt("");

		try {
			await streamAiResponse(
				{
					prompt: userPrompt,
					chatId:
						selectedChatId === NEW_SESSION_CHAT_ID
							? null
							: selectedChatId,
					fileId: selectedFileId,
				},
				onEvent,
			);
		} catch (e) {
			setErrorMessage(errorToString(e));
		} finally {
			if (selectedChatIdRef.current === NEW_SESSION_CHAT_ID) {
				setMessages([]);
				setUserPrompt(userPrompt);
			} else {
				setMessages(
					await getChatMessagesOrdered(selectedChatIdRef.current),
				);
			}
			setIsStreamingResponse(false);
		}
	};

	const handleToolCallUpdate = async () => {
		setMessages(await getChatMessagesOrdered(selectedChatId));
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
		void (async () => {
			setChats(await getAllAiChatsSortedByDateDesc());
		})();

		return () => {
			void stopAiGeneration();
		};
	}, [stopAiGeneration]);

	const handleDelete = async () => {
		await deleteAiChat(selectedChatId);
		await handleChangeSelectedChatId(NEW_SESSION_CHAT_ID);
		setErrorMessage("");
		setShowDeleteChatDialog(false);
		setChats(await getAllAiChatsSortedByDateDesc());
	};

	const handleRenameSubmit = async (
		e: React.SubmitEvent,
		newTitle: string,
	) => {
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
				<RenameDialog
					onHide={() => setShowRenameDialog(false)}
					onSubmit={(e, newTitle) =>
						void handleRenameSubmit(e, newTitle)
					}
					initialTitle={
						chats.find(c => c.id === selectedChatId)?.title ?? ""
					}
				/>
			)}

			<div className={styles.container}>
				{isOpen && (
					<div className={styles.chatPanel}>
						<Header
							selectedChatId={selectedChatId}
							chats={chats}
							onChangeSelectedChatId={value =>
								void handleChangeSelectedChatId(value)
							}
							onClose={() => setIsOpen(false)}
							onRenameClick={() => setShowRenameDialog(true)}
							onDeleteClick={() => setShowDeleteChatDialog(true)}
						/>

						<Messages
							messages={messages}
							errorMessage={errorMessage}
							isStreamingResponse={isStreamingResponse}
							selectedChatId={selectedChatId}
							onToolCallUpdate={handleToolCallUpdate}
							onCloseError={() => setErrorMessage("")}
						/>

						<PromptForm
							isStreamingResponse={isStreamingResponse}
							onSubmit={handleSubmit}
							userPrompt={userPrompt}
							onUserPromptChange={setUserPrompt}
							onStopGeneration={stopAiGeneration}
							onTextAreaKeyDown={handleTextAreaKeyDown}
						/>
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
