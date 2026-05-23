import { useEffect, useRef } from "react";
import styles from "./styles.module.css";
import Message from "../../../api/aiIntegration/entities/message";
import ToolCallDisplay from "./ToolCallDisplay";
import Markdown from "react-markdown";
import Alert from "../../../components/Alert/Alert";
import { AUTO_SCROLL_THRESHOLD } from "../config/constants";
import { mdiFileDocumentOutline, mdiFlagOutline } from "@mdi/js";
import { Icon } from "@mdi/react";
import { openUrl } from "@tauri-apps/plugin-opener";

interface Props {
	messages: Message[];
	isSendingRequest: boolean;
	errorMessage: string | null;
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

	const handleReport = async (content: string) => {
		const title = encodeURIComponent("Inappropriate AI content report");
		const body = encodeURIComponent(
			`**Reported AI response:**\n\n${content}\n\n---\n**What was inappropriate about this response?**\n\n`,
		);
		await openUrl(
			`https://github.com/brainylearn/brainy-app/issues/new?title=${title}&labels=ai-report&body=${body}`,
		);
	};

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
			{messages
				.filter(m => m.content.type !== "toolResult")
				.map((message, i) => (
					<div key={i} className={styles.messageWrapper}>
						<div
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
						{message.content.type === "assistant" && (
							<button
								className={styles.reportButton}
								title="Report inappropriate content"
								onClick={() =>
									void handleReport(
										message.content.value as string,
									)
								}>
								<Icon path={mdiFlagOutline} size={1} />
								Report
							</button>
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
