import { Text } from "@mantine/core";
import ConfirmModal from "../../../components/AppModal/ConfirmModal";

interface DeleteChatModalProps {
	opened: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

function DeleteChatModal({ opened, onConfirm, onClose }: DeleteChatModalProps) {
	return (
		<ConfirmModal
			opened={opened}
			title="Delete chat"
			confirmLabel="Delete"
			confirmColor="red"
			onConfirm={onConfirm}
			onClose={onClose}>
			<Text>
				This chat and all of its messages will be permanently deleted.
				This cannot be undone.
			</Text>
		</ConfirmModal>
	);
}

export default DeleteChatModal;
