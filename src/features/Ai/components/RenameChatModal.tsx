import { useRef, useState } from "react";
import { Button, Group } from "@mantine/core";
import AppModal from "../../../components/AppModal/AppModal";
import AutosizeTextInput from "../../../components/AutosizeTextInput/AutosizeTextInput";

interface RenameChatModalProps {
	opened: boolean;
	initialTitle: string;
	onClose: () => void;
	onConfirm: (newTitle: string) => void;
}

function RenameChatModal({
	opened,
	initialTitle,
	onClose,
	onConfirm,
}: RenameChatModalProps) {
	const [title, setTitle] = useState(initialTitle);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	function handleConfirm() {
		const trimmed = title.trim();
		if (trimmed) onConfirm(trimmed);
		onClose();
	}

	return (
		<AppModal
			opened={opened}
			onClose={onClose}
			title="Rename chat"
			onExitTransitionEnd={() => setTitle(initialTitle)}
			onEnterTransitionEnd={() => inputRef.current?.select()}>
			<AutosizeTextInput
				ref={inputRef}
				autoFocus
				value={title}
				onChange={e => setTitle(e.currentTarget.value)}
				onKeyDown={e => {
					if (e.key === "Enter") handleConfirm();
				}}
			/>
			<Group justify="flex-end" gap="xs" mt="sm">
				<Button variant="default" onClick={onClose}>
					Cancel
				</Button>
				<Button onClick={handleConfirm}>Rename</Button>
			</Group>
		</AppModal>
	);
}

export default RenameChatModal;
