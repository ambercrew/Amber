import { useEffect, useRef } from "react";
import styles from "./styles.module.css";
import Message from "../../../types/backend/entity/message";
import ToolCallDisplay from "./ToolCallDisplay";
import Markdown from "react-markdown";
import Alert from "../../../components/Alert/Alert";
import { AUTO_SCROLL_THRESHOLD } from "../config/constants";

interface Props {
	messages: Message[];
	isStreamingResponse: boolean;
	errorMessage: string;
	selectedChatId: string;
	onToolCallUpdate: () => Promise<void>;
	onCloseError: () => void;
}

export default function Messages({
	messages,
	isStreamingResponse,
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
					className={`${styles.message} ${styles[message.content.type]}`}>
					{(message.content.type === "human" ||
						message.content.type == "assistant") && (
						<Markdown>{message.content.value}</Markdown>
					)}
					{message.content.type === "toolCall" && (
						<ToolCallDisplay
							isStreamingResponse={isStreamingResponse}
							message={message}
							onUpdate={onToolCallUpdate}
						/>
					)}
					{isStreamingResponse && i === messages.length - 1 && (
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
