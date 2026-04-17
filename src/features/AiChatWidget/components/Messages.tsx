import { useEffect, useRef } from "react";
import styles from "./styles.module.css";
import Message from "../../../types/backend/entity/message";
import ToolCallDisplay from "./ToolCallDisplay";
import Markdown from "react-markdown";
import Alert from "../../../components/Alert/Alert";
import { AUTO_SCROLL_THRESHOLD } from "../config/constants";
import { mdiFileDocumentOutline } from "@mdi/js";
import { Icon } from "@mdi/react";

interface Props {
	messages: Message[];
	isSendingRequest: boolean;
	errorMessage: string;
	selectedChatId: string | null;
	onToolCallUpdate: () => Promise<void>;
	onCloseError: () => void;
}

export default function Messages({
	messages,
	isSendingRequest,
	errorMessage,
	selectedChatId,
	onToolCallUpdate,
	onCloseError,
}: Props) {
	const messagesContainerRef = useRef<HTMLDivElement | null>(null);
	const followTail = useRef(true);

	useEffect(() => {
		const container = messagesContainerRef.current;
		if (container && followTail.current) {
			container.scrollTop = container.scrollHeight;
		}
	}, [messages]);

	useEffect(() => {
		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTop =
				messagesContainerRef.current.scrollHeight;
		}

		followTail.current = true;
	}, [selectedChatId]);

	const handleScroll = () => {
		if (!messagesContainerRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } =
			messagesContainerRef.current;
		followTail.current =
			scrollHeight - scrollTop <= clientHeight + AUTO_SCROLL_THRESHOLD;
	};

	return (
		<div
			className={styles.messages}
			ref={messagesContainerRef}
			data-testid="messages-container"
			onScroll={handleScroll}>
			{messages.map((message, i) => (
				<div
					key={i}
					className={`${styles.message} ${
						message.content.type === "human" ||
						message.content.type === "document"
							? styles.human
							: styles.assistant
					}`}>
					{(message.content.type === "human" ||
						message.content.type == "assistant") && (
						<Markdown>{message.content.value}</Markdown>
					)}
					{message.content.type === "toolCall" && (
						<ToolCallDisplay
							isSendingRequest={isSendingRequest}
							message={message}
							onUpdate={onToolCallUpdate}
						/>
					)}
					{message.content.type === "document" && (
						<div
							className={styles.document}
							title="Uploaded document">
							<div className={styles.icon}>
								<Icon
									path={mdiFileDocumentOutline}
									size={1.6}
								/>
							</div>
							<p>{message.content.value.fileName}</p>
						</div>
					)}

					{isSendingRequest && i === messages.length - 1 && (
						<div className={styles.spinner}></div>
					)}
				</div>
			))}

			{errorMessage && (
				<Alert type="error" onClose={onCloseError}>
					{errorMessage}
				</Alert>
			)}
		</div>
	);
}
