import {
	mdiAttachment,
	mdiSendVariantOutline,
	mdiStopCircleOutline,
} from "@mdi/js";
import Icon from "@mdi/react";
import { useEffect, useRef } from "react";

interface Props {
	isStreamingResponse: boolean;
	userPrompt: string;
	onTextAreaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	onUserPromptChange: (value: string) => void;
	onSubmit: (e: React.SubmitEvent) => void;
	onStopGeneration: () => Promise<void>;
}

export default function PromptForm({
	isStreamingResponse,
	userPrompt,
	onUserPromptChange,
	onSubmit,
	onStopGeneration,
	onTextAreaKeyDown,
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
			<button className="transparent" title="Add attachment">
				<Icon path={mdiAttachment} size={1} />
			</button>
			{!isStreamingResponse && (
				<button className="transparent" title="Send">
					<Icon path={mdiSendVariantOutline} size={1} />
				</button>
			)}

			{isStreamingResponse && (
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
