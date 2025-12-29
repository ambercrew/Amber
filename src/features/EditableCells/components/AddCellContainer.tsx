import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { mdiPlus } from "@mdi/js";
import NewCellTypeSelector from "./NewCellTypeSelector";
import { useState } from "react";
import { CellType } from "../../../types/backend/entity/cell";
import useGlobalKey from "../../../hooks/useGlobalKey";
import { CELL_ID_DRAG_FORMAT } from "../config/constants";
import Dialog from "../../../components/Dialog/Dialog";

interface Props {
	onDrop: (e: React.DragEvent) => void;
	onAddNewCell: (cellType: CellType) => void;
}

function AddCellContainer({ onDrop, onAddNewCell }: Props) {
	const [showAddNewCellPopup, setShowAddNewCellPopup] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);

	useGlobalKey(e => {
		if (e.key === "Escape") {
			setShowAddNewCellPopup(false);
		} else if (e.ctrlKey && !e.shiftKey && e.key === "Enter") {
			setShowAddNewCellPopup(true);
		}
	}, "keydown");

	const handleDragOver = (e: React.DragEvent) => {
		if (!e.dataTransfer.types.some(t => t === CELL_ID_DRAG_FORMAT)) {
			return;
		}
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDrop = (e: React.DragEvent) => {
		setIsDragOver(false);
		onDrop(e);
	};

	const handleAddCellClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowAddNewCellPopup(true);
	};

	return (
		<>
			<div
				className={`${styles.addButtonContainer}
                    ${isDragOver ? styles.dragOver : ""}`}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onDragLeave={() => setIsDragOver(false)}>
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
