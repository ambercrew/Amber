import styles from "./styles.module.css";
import { mdiClose, mdiCheckOutline, mdiFileDocumentOutline } from "@mdi/js";
import { Icon } from "@mdi/react";
import Markdown from "react-markdown";
import Message, {
	ToolCallContent,
	ToolCallStatus,
} from "../../../api/aiIntegration/entities/message";
import { useTransition } from "react";
import {
	acceptToolCall,
	rejectToolCall,
} from "../../../api/aiIntegration/api/aiApi";
import useAppSelector from "../../../hooks/useAppSelector";
import { selectRootFolder } from "../../../stores/fileSystem/fileSystemSelectors";
import getFolderChildById from "../../../utils/getFolderChildById";
import { useSearchParams, useNavigate } from "react-router";
import { FILE_ID_QUERY_PARAMETER } from "../../../config/constants";
import {
	TOOL_CALL_ACCEPTED_EVENT,
	ToolCallAcceptedPayload,
} from "../../../types/events/toolCallAcceptedEvent";

interface Props {
	isSendingRequest: boolean;
	message: Message;
	onUpdate: () => Promise<void>;
}

export default function ToolCallDisplay({
	isSendingRequest,
	message,
	onUpdate,
}: Props) {
	const [isSendingRequestToolCall, startRequest] = useTransition();
	const rootFolder = useAppSelector(selectRootFolder);
	const toolCall = message.content.value as ToolCallContent;
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const handleRejectToolCall = () => {
		startRequest(async () => {
			await rejectToolCall(message.id);
			await onUpdate();
		});
	};

	const handleAcceptToolCall = () => {
		startRequest(async () => {
			await acceptToolCall(message.id);
			await onUpdate();
			window.dispatchEvent(
				new CustomEvent<ToolCallAcceptedPayload>(
					TOOL_CALL_ACCEPTED_EVENT,
					{
						detail: {
							fileId: toolCall.fileId,
						},
					},
				),
			);
		});
	};

	const file =
		toolCall.fileId && getFolderChildById(rootFolder, toolCall.fileId);

	const handleNavigateToFileClick = () => {
		if (!file) return;

		searchParams.set(FILE_ID_QUERY_PARAMETER, file.id);
		void navigate({
			pathname: "editor",
			search: searchParams.toString(),
		});
	};

	return (
		<div className={styles.toolCall}>
			<div className={styles.toolCallHeader}>
				<p>{toolCall.displayName}</p>
				{file && (
					<button
						className="transparent"
						title="Navigate to file"
						onClick={handleNavigateToFileClick}>
						<Icon path={mdiFileDocumentOutline} size={1} />
						<p>{file.name}</p>
					</button>
				)}
			</div>

			<Markdown>{toolCall.displayDescriptionMarkdown}</Markdown>
			<div className={styles.footer}>
				{toolCall.status === ToolCallStatus.Rejected && (
					<div className={styles.reject}>
						<Icon path={mdiClose} size={1} />
						<p>Rejected</p>
					</div>
				)}

				{toolCall.status === ToolCallStatus.Accepted && (
					<div className={styles.accept}>
						<Icon path={mdiCheckOutline} size={1} />
						<p>Accepted</p>
					</div>
				)}

				{toolCall.status === ToolCallStatus.Pending && (
					<>
						<button
							className={`transparent ${styles.reject}`}
							type="button"
							disabled={
								isSendingRequest ||
								!file ||
								isSendingRequestToolCall
							}
							title={
								isSendingRequest
									? "Please wait until generation is finished"
									: "Reject"
							}
							onClick={handleRejectToolCall}>
							<Icon path={mdiClose} size={1} />
							<p>Reject</p>
						</button>
						<button
							className={`transparent ${styles.accept}`}
							type="button"
							disabled={
								isSendingRequest ||
								!file ||
								isSendingRequestToolCall
							}
							title={
								isSendingRequest
									? "Please wait until generation is finished"
									: "Accept"
							}
							onClick={handleAcceptToolCall}>
							<Icon path={mdiCheckOutline} size={1} />
							<p>Accept</p>
						</button>
					</>
				)}
			</div>
		</div>
	);
}
