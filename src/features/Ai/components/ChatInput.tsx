import { KeyboardEvent, useState } from "react";
import { ActionIcon, Group, Textarea, Tooltip } from "@mantine/core";
import { ArrowUpIcon, PaperclipIcon, StopIcon } from "@phosphor-icons/react";
import { open } from "@tauri-apps/plugin-dialog";

interface ChatInputProps {
	disabled?: boolean;
	isStreaming: boolean;
	onSend: (prompt: string) => void;
	onStop: () => void;
	onUpload: (path: string) => void;
}

function ChatInput({
	disabled = false,
	isStreaming,
	onSend,
	onStop,
	onUpload,
}: ChatInputProps) {
	const [value, setValue] = useState("");

	function handleSend() {
		const trimmed = value.trim();
		if (!trimmed || isStreaming) return;
		onSend(trimmed);
		setValue("");
	}

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	async function handleUploadClick() {
		const selected = await open({
			multiple: false,
			filters: [{ name: "Documents", extensions: ["pdf", "txt", "md"] }],
		});
		if (typeof selected !== "string") return;
		onUpload(selected);
	}

	return (
		<Group align="flex-end" gap={6} pt="xs" wrap="nowrap">
			<Tooltip label="Upload a document">
				<ActionIcon
					variant="default"
					size="lg"
					disabled={disabled}
					onClick={() => void handleUploadClick()}
					aria-label="Upload document">
					<PaperclipIcon size={18} />
				</ActionIcon>
			</Tooltip>

			<Textarea
				style={{ flex: 1 }}
				placeholder="Ask a question…"
				autosize
				minRows={1}
				maxRows={6}
				value={value}
				disabled={disabled}
				onChange={e => setValue(e.currentTarget.value)}
				onKeyDown={handleKeyDown}
			/>

			{isStreaming ? (
				<ActionIcon
					variant="filled"
					color="red"
					size="lg"
					onClick={onStop}
					aria-label="Stop generation">
					<StopIcon size={18} />
				</ActionIcon>
			) : (
				<ActionIcon
					variant="filled"
					size="lg"
					disabled={disabled || !value.trim()}
					onClick={handleSend}
					aria-label="Send message">
					<ArrowUpIcon size={18} />
				</ActionIcon>
			)}
		</Group>
	);
}

export default ChatInput;
