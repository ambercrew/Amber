import {
	mdiDeleteOutline,
	mdiDotsVertical,
	mdiInformationOutline,
	mdiPencilOutline,
	mdiPlus,
	mdiRestore,
} from "@mdi/js";
import styles from "./styles.module.css";
import { Icon } from "@mdi/react";
import Repetition from "../../../api/cells/entities/repetition";
import Cell, { CellType } from "../../../api/cells/entities/cell";
import { useRef, useState } from "react";
import useOutsideClick from "../../../hooks/useOutsideClick";
import ConfirmationDialog from "../../../components/ConfirmationDialog/ConfirmationDialog";
import { resetRepetitionsForCell } from "../../../api/cells/api/repetitionApi";
import useGlobalKey from "../../../hooks/useGlobalKey";
import RepetitionsInfo from "./RepetitionsInfo";
import { CallApiFn } from "../../../hooks/useApi";
import ActionsMenu, {
	Action,
} from "../../../components/ActionsMenu/ActionsMenu";
import { isModKey } from "../../../utils/keyboardUtils";
import NewCellTypeSelector from "./NewCellTypeSelector";

interface Props {
	repetitions: Repetition[];
	cell: Cell;
	enableFileSpecificFunctionality: boolean;
	fileMode: "single" | "global search";
	callApi: CallApiFn;
	onResetRepetitions: () => void;
	onCellDeleteConfirm: () => void;
	onInsertNewCell: (cellType: CellType) => void;
	onEditButtonClick?: (fileId: string, cellId: string) => void;
}

function FocusTools({
	repetitions,
	cell,
	enableFileSpecificFunctionality,
	fileMode,
	callApi,
	onResetRepetitions,
	onCellDeleteConfirm,
	onInsertNewCell,
	onEditButtonClick,
}: Props) {
	const [showInsertNewCell, setShowInsertNewCell] = useState(false);
	const [showRepetitionsInfo, setShowRepetitionsInfo] = useState(false);
	const [showResetRepetitionsDialog, setShowResetRepetitionsDialog] =
		useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showActionsMenu, setShowActionsMenu] = useState(false);
	const focusToolsRef = useRef<HTMLDivElement>(null);

	const hideAllPopups = () => {
		setShowRepetitionsInfo(false);
		setShowActionsMenu(false);
		setShowResetRepetitionsDialog(false);
		setShowInsertNewCell(false);
	};

	useOutsideClick(focusToolsRef as React.RefObject<HTMLElement>, () => {
		hideAllPopups();
	});

	const hideDeleteDialog = () => setShowDeleteDialog(false);
	const closeMenu = () => setShowActionsMenu(false);

	const handleShowRepetitionsInfoClick = () => {
		hideAllPopups();
		setShowRepetitionsInfo(true);
	};

	const handleResetRepetitionsConfirm = async () => {
		await callApi(async () => {
			setShowResetRepetitionsDialog(false);
			await resetRepetitionsForCell(cell.id);
			onResetRepetitions();
		});
	};

	const handleCellDeleteConfirm = () => {
		hideDeleteDialog();
		onCellDeleteConfirm();
	};

	useGlobalKey(e => {
		if (e.altKey && e.key === "Delete") {
			setShowDeleteDialog(true);
		} else if (e.key === "Escape") {
			hideAllPopups();
		} else if (isModKey(e) && e.shiftKey && e.key === "Enter") {
			e.stopPropagation();
			setShowInsertNewCell(!showInsertNewCell);
		}
	});

	const actions: Action[] = [];

	if (fileMode === "global search") {
		actions.push({
			iconName: mdiPencilOutline,
			text: "Edit in file",
			onClick: () => {
				if (onEditButtonClick) onEditButtonClick(cell.fileId, cell.id);
				closeMenu();
			},
		});
	}

	if (enableFileSpecificFunctionality) {
		actions.push({
			iconName: mdiPlus,
			text: "Insert cell below",
			shortcut: "Ctrl + Shift + Enter",
			onClick: () => {
				setShowInsertNewCell(true);
				setShowRepetitionsInfo(false);
				closeMenu();
			},
		});
	}

	if (cell.cellType !== "Note") {
		actions.push({
			iconName: mdiRestore,
			text: "Reset repetitions",
			onClick: () => {
				setShowResetRepetitionsDialog(true);
				closeMenu();
			},
		});

		if (repetitions.length > 0) {
			actions.push({
				iconName: mdiInformationOutline,
				text: "Show repetitions info",
				onClick: handleShowRepetitionsInfoClick,
			});
		}
	}

	actions.push({
		iconName: mdiDeleteOutline,
		text: "Delete cell",
		shortcut: "Alt + Del",
		onClick: () => {
			setShowDeleteDialog(true);
			closeMenu();
		},
	});

	const handleToggleFocusTools = () => {
		hideAllPopups();
		setShowActionsMenu(!showActionsMenu);
	};

	const handleInsertNewCell = (cellType: CellType) => {
		hideAllPopups();
		onInsertNewCell(cellType);
	};

	return (
		<>
			{showDeleteDialog && (
				<ConfirmationDialog
					text="Are you sure you want to delete the cell?"
					title="Delete cell"
					icon={mdiDeleteOutline}
					onCancel={hideDeleteDialog}
					onConfirm={() => void handleCellDeleteConfirm()}
				/>
			)}

			{showResetRepetitionsDialog && (
				<ConfirmationDialog
					text="Are you sure you want to reset all repetitions related to this cell?"
					title="Reset repetitions"
					icon={mdiRestore}
					onCancel={() => setShowResetRepetitionsDialog(false)}
					onConfirm={() => void handleResetRepetitionsConfirm()}
				/>
			)}

			<div
				className={styles.focusTools}
				ref={focusToolsRef}
				onClick={e => e.stopPropagation()}>
				<button
					className="transparent"
					title="Actions"
					onClick={handleToggleFocusTools}>
					<Icon path={mdiDotsVertical} size={1} />
				</button>

				{showInsertNewCell && enableFileSpecificFunctionality && (
					<NewCellTypeSelector
						className={`pop-over ${styles.insertCellPopup}`}
						onClick={handleInsertNewCell}
						onHide={() => setShowInsertNewCell(false)}
					/>
				)}

				{showRepetitionsInfo && (
					<RepetitionsInfo
						repetitions={repetitions}
						cellType={cell.cellType}
					/>
				)}
				{showActionsMenu && (
					<ActionsMenu
						actions={actions}
						containerRef={focusToolsRef}
						className={styles.focusToolsActionsMenu}
					/>
				)}
			</div>
		</>
	);
}

export default FocusTools;
