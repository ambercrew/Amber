import { Icon } from "@mdi/react";
import styles from "./styles.module.css";
import { mdiPlus } from "@mdi/js";
import NewCellTypeSelector from "./NewCellTypeSelector";
import { useState } from "react";
import { CellType } from "../../../api/cells/entities/cell";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { isModKey } from "../../../utils/keyboardUtils";
import Dialog from "../../../components/Dialog/Dialog";
import { useDroppable } from "@dnd-kit/react";
import CellDropContainerData, {
	CELL_DROP_CONTAINER_TYPE,
} from "../types/cellDropContainerData";

interface Props {
	onAddNewCell: (cellType: CellType) => void;
}

function AddCellContainer({ onAddNewCell }: Props) {
	const [showAddNewCellPopup, setShowAddNewCellPopup] = useState(false);

	const { ref: setDroppableNodeRef, isDropTarget } = useDroppable({
		id: "add-cell-container",
		type: CELL_DROP_CONTAINER_TYPE,
		data: { type: "add-cell-container" } as CellDropContainerData,
	});

	useGlobalKey(
		e => {
			if (e.key === "Escape") {
				setShowAddNewCellPopup(false);
			} else if (isModKey(e) && !e.shiftKey && e.key === "Enter") {
				e.stopPropagation();
				setShowAddNewCellPopup(true);
			}
		},
		"keydown",
		true,
	);

	const handleAddCellClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowAddNewCellPopup(true);
	};

	return (
		<>
			<div
				className={`${styles.addButtonContainer}
                    ${isDropTarget ? styles.dragOver : ""}`}
				ref={setDroppableNodeRef}>
				<button
					className={`${styles.addButton} grey-button`}
					onClick={handleAddCellClick}>
					<Icon path={mdiPlus} size={1} />
					<span title="(Ctrl + Enter)">Add Cell</span>
				</button>
			</div>

			{showAddNewCellPopup && (
				<Dialog
					className={styles.addCellDialog}
					onHide={() => setShowAddNewCellPopup(false)}
					focusTrap={true}>
					<NewCellTypeSelector
						onClick={cellType => {
							onAddNewCell(cellType);
							setShowAddNewCellPopup(false);
						}}
						onHide={() => setShowAddNewCellPopup(false)}
					/>
				</Dialog>
			)}
		</>
	);
}

export default AddCellContainer;
