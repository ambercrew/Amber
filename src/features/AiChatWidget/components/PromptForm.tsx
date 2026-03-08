import { open } from "@tauri-apps/plugin-dialog";
import {
	mdiAttachment,
	mdiSendVariantOutline,
	mdiStopCircleOutline,
} from "@mdi/js";
import Icon from "@mdi/react";
import { useEffect, useRef } from "react";

interface Props {
	isSendingRequest: boolean;
	userPrompt: string;
	selectedChatId: string | null;
	onTextAreaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	onUserPromptChange: (value: string) => void;
	onSubmit: (e: React.SubmitEvent) => void;
	onStopGeneration: () => Promise<void>;
	onUploadDocument: (path: string) => Promise<void>;
}

export default function PromptForm({
	isSendingRequest,
	userPrompt,
	selectedChatId,
	onUserPromptChange,
	onSubmit,
	onStopGeneration,
	onTextAreaKeyDown,
	onUploadDocument,
}: Props) {
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (textAreaRef.current) {
			textAreaRef.current.style.height = "auto";
			textAreaRef.current.style.height =
				textAreaRef.current.scrollHeight +
				// Adding some extra space to not show scrollbars when there is
				// no need.
				2 +
				"px";
		}
	}, [userPrompt]);

	const handleUploadDocument = async () => {
		const path = await open({
			directory: false,
		});

		if (!path) return;
		await onUploadDocument(path);
	};

	return (
		<form onSubmit={onSubmit}>
			<textarea
				ref={textAreaRef}
				placeholder="Speak with AI"
				value={userPrompt}
				onChange={e => onUserPromptChange(e.target.value)}
				onKeyDown={onTextAreaKeyDown}
				rows={1}
				autoFocus
			/>
			<button
				className="transparent"
				title="Upload document"
				onClick={() => void handleUploadDocument()}
				disabled={isSendingRequest || selectedChatId === null}>
				<Icon path={mdiAttachment} size={1} />
			</button>
			{!isSendingRequest && (
				<button className="transparent" title="Send">
					<Icon path={mdiSendVariantOutline} size={1} />
				</button>
			)}

			{isSendingRequest && (
				<button
					className="transparent"
					title="Stop"
					onClick={() => void onStopGeneration()}>
					<Icon path={mdiStopCircleOutline} size={1} />
				</button>
			)}
		</form>
	);
}
