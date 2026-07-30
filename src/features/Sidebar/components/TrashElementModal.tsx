import { Text } from "@mantine/core";
import { useDispatch } from "react-redux";
import ConfirmModal from "../../../components/AppModal/ConfirmModal";
import { trashElementAction } from "../../../stores/trash/trashActions";
import { AppDispatch } from "../../../stores/store";
import { ElementId } from "../../../types/elements/elementId";

interface TrashElementModalProps {
	elementId: ElementId | null;
	onClose: () => void;
}

function TrashElementModal({ elementId, onClose }: TrashElementModalProps) {
	const dispatch = useDispatch<AppDispatch>();

	function handleTrash() {
		if (!elementId) return;
		void dispatch(trashElementAction(elementId));
	}

	return (
		<ConfirmModal
			opened={elementId !== null}
			title="Move to trash"
			confirmLabel="Move to trash"
			confirmColor="red"
			onConfirm={handleTrash}
			onClose={onClose}>
			<Text>
				This element and everything under it will be moved to the trash,
				where you can restore it until it is purged.
			</Text>
		</ConfirmModal>
	);
}

export default TrashElementModal;
