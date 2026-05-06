import { Icon } from "@mdi/react";
import { mdiDeleteOutline, mdiRobotOutline } from "@mdi/js";
import styles from "./styles.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { Channel } from "@tauri-apps/api/core";
import { StreamLlmResponseEvent } from "../../../api/aiIntegration/events/streamLlmResponseEvent";
import {
	deleteAiChat,
	getAllAiChatsSortedByDateDesc,
	getChatMessagesOrdered,
	renameAiChat,
	stopAiGeneration as stopAiGenerationApi,
	streamAiResponse,
	uploadDocument,
} from "../../../api/aiIntegration/api/aiApi";
import Message, {
	MessageContentHumanAssistant,
} from "../../../api/aiIntegration/entities/message";
import {
	TEMP_ASSISTANT_MESSAGE_ID,
	TEMP_CHAT_ID,
	TEMP_HUMAN_MESSAGE_ID,
} from "../config/constants";
import Chat from "../../../api/aiIntegration/entities/chat";
import ConfirmationDialog from "../../../components/ConfirmationDialog/ConfirmationDialog";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectSettings } from "../../../stores/settings/settingsSelector";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { isModKey } from "../../../utils/keyboardUtils";
import { useSearchParams } from "react-router";
import { FILE_ID_QUERY_PARAMETER } from "../../../config/constants";
import Header from "./Header";
import RenameDialog from "./RenameDialog";
import Messages from "./Messages";
import PromptForm from "./PromptForm";
import useApiWithCustomError from "../../../hooks/useApiWithCustomError";

export default function AiChatWidget() {
	const settings = useAppSelector(selectSettings);
	return settings?.enableAi ? <AiChatWidgetInner /> : null;
}

function AiChatWidgetInner() {
	const [isOpen, setIsOpen] = useState(false);
	const [showDeleteChatDialog, setShowDeleteChatDialog] = useState(false);
	const [showRenameDialog, setShowRenameDialog] = useState(false);
	const [userPrompt, setUserPrompt] = useState("");
	const {
		errorMessage,
		isSendingRequest,
		callApi,
		clearErrorMessage,
		setCustomErrorMessage,
	} = useApiWithCustomError();
	const [messages, setMessages] = useState<Message[]>([]);
	const [chats, setChats] = useState<Chat[]>([]);
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	// Used to have reference to the same selected chat id, useful for streaming.
	const selectedChatIdRef = useRef(selectedChatId);
	const [searchParams] = useSearchParams();
	const selectedFileId = searchParams.get(FILE_ID_QUERY_PARAMETER);

	useEffect(() => {
		selectedChatIdRef.current = selectedChatId;
	}, [selectedChatId]);

	useGlobalKey(e => {
		if (isModKey(e) && e.key.toLowerCase() === "j") {
			e.preventDefault();
			setIsOpen(isOpen => !isOpen);
		}
	}, "keydown");

	const stopAiGeneration = useCallback(async () => {
		await stopAiGenerationApi();
	}, []);

	const handleChangeSelectedChatId = async (newChatId: string | null) => {
		if (newChatId !== selectedChatId) {
			clearErrorMessage();
			setSelectedChatId(newChatId);
			await stopAiGeneration();
		}

		if (newChatId === null) {
			setMessages([]);
		} else {
			setMessages(await getChatMessagesOrdered(newChatId));
		}
	};

	const sendMessage = async () => {
		if (!userPrompt.trim() || isSendingRequest) return;

		clearErrorMessage();
		setMessages(messages => [
			...messages,
			{
				chatId: selectedChatId ?? TEMP_CHAT_ID,
				id: TEMP_HUMAN_MESSAGE_ID,
				content: {
					type: "human",
					value: userPrompt,
				},
			},
			{
				chatId: selectedChatId ?? TEMP_CHAT_ID,
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
				setCustomErrorMessage(event.data);
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

		await callApi(
			async () => {
				await streamAiResponse(
					{
						prompt: userPrompt,
						chatId: selectedChatId,
						fileId: selectedFileId,
					},
					onEvent,
				);
			},
			async () => {
				if (selectedChatIdRef.current === null) {
					setMessages([]);
					setUserPrompt(userPrompt);
				} else {
					setMessages(
						await getChatMessagesOrdered(selectedChatIdRef.current),
					);
				}
			},
		);
	};

	const handleToolCallUpdate = async () => {
		if (selectedChatId !== null) {
			setMessages(await getChatMessagesOrdered(selectedChatId));
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
		void (async () => {
			setChats(await getAllAiChatsSortedByDateDesc());
		})();

		return () => {
			void stopAiGeneration();
		};
	}, [stopAiGeneration]);

	const handleDelete = async () => {
		if (selectedChatId === null) return;

		await deleteAiChat(selectedChatId);
		await handleChangeSelectedChatId(null);
		clearErrorMessage();
		setShowDeleteChatDialog(false);
		setChats(await getAllAiChatsSortedByDateDesc());
	};

	const handleRenameSubmit = async (
		e: React.SubmitEvent,
		newTitle: string,
	) => {
		if (selectedChatId === null) return;

		e.stopPropagation();
		e.preventDefault();
		setShowRenameDialog(false);

		await callApi(async () => {
			await renameAiChat(selectedChatId, newTitle);
			setChats(await getAllAiChatsSortedByDateDesc());
		});
	};

	const handleUploadDocument = async (path: string) => {
		if (selectedChatId === null) return;

		const fileName = path.replace(/^.*[/\\]/, "");

		setMessages(messages => [
			...messages,
			{
				id: TEMP_HUMAN_MESSAGE_ID,
				chatId: selectedChatId,
				content: {
					type: "document",
					value: {
						fileName: fileName,
					},
				},
			} as Message,
		]);

		await callApi(
			async () => {
				await uploadDocument(path, selectedChatId);
			},
			async () => {
				if (selectedChatIdRef.current !== null) {
					setMessages(
						await getChatMessagesOrdered(selectedChatIdRef.current),
					);
				}
			},
		);
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
							isSendingRequest={isSendingRequest}
							selectedChatId={selectedChatId}
							onToolCallUpdate={handleToolCallUpdate}
							onCloseError={clearErrorMessage}
						/>

						<PromptForm
							isSendingRequest={isSendingRequest}
							userPrompt={userPrompt}
							selectedChatId={selectedChatId}
							onUploadDocument={handleUploadDocument}
							onSubmit={handleSubmit}
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
