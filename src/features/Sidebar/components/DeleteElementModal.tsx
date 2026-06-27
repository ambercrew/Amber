import { Button, Group, Modal, Text } from "@mantine/core";
import { useDispatch } from "react-redux";
import { deleteElementAction } from "../../../stores/elements/elementsActions";
import { AppDispatch } from "../../../stores/store";
import { ElementId } from "../../../types/elements/elementId";

interface DeleteElementModalProps {
	elementId: ElementId | null;
	onClose: () => void;
}

function DeleteElementModal({ elementId, onClose }: DeleteElementModalProps) {
	const dispatch = useDispatch<AppDispatch>();

	async function handleDelete() {
		if (!elementId) return;
		await dispatch(deleteElementAction(elementId));
		onClose();
	}

	return (
		<Modal
			opened={elementId !== null}
			onClose={onClose}
			title="Delete element"
			centered>
			<Text>
				Are you sure you want to delete this element? This action cannot
				be undone.
			</Text>
			<Group justify="flex-end" gap="xs">
				<Button variant="default" onClick={onClose}>
					Cancel
				</Button>
				<Button color="red" onClick={() => void handleDelete()}>
					Delete
				</Button>
			</Group>
		</Modal>
	);
}

export default DeleteElementModal;
