import IncrementalReading, {
	IncrementalReadingPriority,
} from "../../../api/cells/valueObjects/incrementalReading";
import Dialog from "../../../components/Dialog/Dialog";
import RichTextEditor from "../../../components/RichTextEditor/RichTextEditor";
import Select, { Option } from "../../../components/Select/Select";
import { Icon } from "@mdi/react";
import styles from "./styles.module.css";
import {
	mdiCheckCircleOutline,
	mdiExitToApp,
	mdiMarker,
	mdiTimerPauseOutline,
} from "@mdi/js";
import {
	$isSelectionInsideHighlight,
	HighlightNode,
} from "./RichTextEditorPlugins/highlight/highlightNode";
import {
	HIGHLIGHT_SHORTCUT_KEY,
	HighlightPlugin,
	TOGGLE_HIGHLIGHT_NODE,
} from "./RichTextEditorPlugins/highlight/highlightPlugin";
import { getModKeyLabel } from "../../../utils/keyboardUtils";
import { useState } from "react";
import ScheduleLaterDialog from "./ScheduleLaterDialog";
import { scheduleIncrementalReadingLater } from "../../../api/incrementalReading/api/incrementalReadingApi";
import ReadingPositionPlugin from "../../../components/RichTextEditor/Plugins/ReadingPositionPlugin";

const priorityOptions: Option[] = [
	{ label: "High", value: "high" },
	{ label: "Normal", value: "normal" },
	{ label: "Low", value: "low" },
];

interface Props {
	cellId: string;
	incrementalReading: IncrementalReading;
	onChange: (
		updater: (current: IncrementalReading) => Partial<IncrementalReading>,
	) => void;
	onClose: () => void;
}

export default function ReadDialog({
	cellId,
	incrementalReading,
	onChange,
	onClose,
}: Props) {
	const [showScheduleLater, setShowScheduleLater] = useState(false);

	const handlePriorityChange = (value: string) => {
		const priority = value as IncrementalReadingPriority;
		onChange(() => ({ priority }));
	};

	const handleDone = () => {
		onChange(() => ({ completed: true }));
		onClose();
	};

	const handleScheduleLater = async (date: Date) => {
		await scheduleIncrementalReadingLater(cellId, date);
		setShowScheduleLater(false);
		onChange(() => ({ completed: false }));
		onClose();
	};

	return (
		<>
			<Dialog
				focusTrap
				className={styles.readDialog}
				onHide={onClose}
				fullScreenOnSmallDevices>
				<div className={styles.header}>
					<h2
						title={incrementalReading.title ?? ""}
						className={styles.title}>
						{incrementalReading.title}
					</h2>
					<Select
						containerClassName={styles.select}
						options={priorityOptions}
						currentValue={incrementalReading.priority}
						onChangeValue={handlePriorityChange}
					/>
				</div>
				<div className={styles.readDialogBody}>
					<RichTextEditor
						content={incrementalReading.content!}
						containerClassName={styles.richTextEditor}
						eagerLoadRichTextEditor
						onChange={content => onChange(() => ({ content }))}
						extraNodes={[HighlightNode]}
						plugins={[
							<HighlightPlugin key={1} />,
							<ReadingPositionPlugin
								key={2}
								initialBlockIndex={
									incrementalReading.scrollPosition ?? 0
								}
								onPositionChange={index =>
									onChange(() => ({
										scrollPosition: index,
									}))
								}
							/>,
						]}
						additionalFloatingMenuButtons={[
							{
								name: "Toggle highlight",
								title: `Toggle highlight (${getModKeyLabel()}+Shift+${HIGHLIGHT_SHORTCUT_KEY.toUpperCase()})`,
								icon: mdiMarker,
								onClick: editor =>
									editor.dispatchCommand(
										TOGGLE_HIGHLIGHT_NODE,
										undefined,
									),
								isActive: $isSelectionInsideHighlight,
							},
						]}
					/>
				</div>
				<div className={styles.footer}>
					<button
						className={`transparent ${styles.rowButton} ${styles.withBorder}`}
						onClick={onClose}
						title="Close without rescheduling">
						<Icon path={mdiExitToApp} size={1} />
						<span>Exit</span>
					</button>
					<button
						className={`transparent ${styles.rowButton} ${styles.withBorder}`}
						onClick={handleDone}
						title="Mark as completed">
						<Icon path={mdiCheckCircleOutline} size={1} />
						<span>Done</span>
					</button>
					<button
						className={`primary ${styles.rowButton}`}
						onClick={() => setShowScheduleLater(true)}
						title="Continue reading later">
						<Icon path={mdiTimerPauseOutline} size={1} />
						<span>Later</span>
					</button>
				</div>
			</Dialog>

			{showScheduleLater && (
				<ScheduleLaterDialog
					onHide={() => setShowScheduleLater(false)}
					onSchedule={date => void handleScheduleLater(date)}
				/>
			)}
		</>
	);
}
