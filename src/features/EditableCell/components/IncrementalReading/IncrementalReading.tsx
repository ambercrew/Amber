import styles from "./styles.module.css";
import Cell from "../../../../api/cells/entities/cell";
import { default as IncrementalReadingType } from "../../../../api/cells/valueObjects/incrementalReading";
import { useCallback, useEffect, useState } from "react";
import ImportContainer from "./ImportContainer";
import { Icon } from "@mdi/react";
import {
	mdiBookOpenVariantOutline,
	mdiCardsOutline,
	mdiClockOutline,
	mdiWeb,
} from "@mdi/js";
import ReadDialog from "../../../IncrementalReading/components/ReadDialog";
import ExtractsReviewDialog from "../../../ExtractsReview/components/ExtractsReviewDialog";
import {
	getIncrementalReadingSchedule,
	getPendingExtractsCount,
} from "../../../../api/incrementalReading/api/incrementalReadingApi";
import IncrementalReadingSchedule from "../../../../api/incrementalReading/entities/incrementalReadingSchedule";
import formatDueDate from "../../../../utils/formatDueDate";
import useApi from "../../../../hooks/useApi";
import EditableCellInput from "../EditableCellInput";
import Tag from "../../../../components/Tag/Tag";
import TagRow from "../../../../components/Tag/TagRow";

interface Props {
	cell: Cell;
	autofocus: boolean;
	// Used to force changes to be saved now!
	saveChanges: () => Promise<void>;
	onChange: (content: string) => void;
}

export default function IncrementalReading({
	cell,
	autofocus,
	onChange,
	saveChanges,
}: Props) {
	const [incrementalReading, setIncrementalReading] = useState(() => {
		return JSON.parse(cell.content) as IncrementalReadingType;
	});
	const [isImported, setIsImported] = useState(
		incrementalReading.content !== null,
	);
	const [showReadDialog, setShowReadDialog] = useState(false);
	const [showExtractsDialog, setShowExtractsDialog] = useState(false);
	const [schedule, setSchedule] = useState<IncrementalReadingSchedule | null>(
		null,
	);
	const [pendingExtractsCount, setPendingExtractsCount] = useState<
		number | null
	>(null);
	const { callApi, errorMessage } = useApi();

	const retrieveIncrementalReadingSchedule = useCallback(async () => {
		await callApi(async () => {
			const [newSchedule, count] = await Promise.all([
				getIncrementalReadingSchedule(cell.id),
				getPendingExtractsCount(cell.id),
			]);
			setSchedule(newSchedule);
			setPendingExtractsCount(count);
		});
	}, [cell.id, callApi]);

	useEffect(() => {
		void retrieveIncrementalReadingSchedule();
	}, [retrieveIncrementalReadingSchedule, isImported]);

	const handleChange = (
		updater: (
			current: IncrementalReadingType,
		) => Partial<IncrementalReadingType>,
	) => {
		setIncrementalReading(current => {
			const updated = { ...current, ...updater(current) };
			onChange(JSON.stringify(updated));
			return updated;
		});
	};

	const handleCloseExtractDialog = useCallback(() => {
		setShowExtractsDialog(false);
		void (async () => {
			await retrieveIncrementalReadingSchedule();
			await saveChanges();
		})();
	}, [retrieveIncrementalReadingSchedule, saveChanges]);

	if (!isImported) {
		return (
			<ImportContainer
				autofocus={autofocus}
				onImport={ir => {
					void (async () => {
						handleChange(() => ir);
						await saveChanges();
						await retrieveIncrementalReadingSchedule();
						setIsImported(true);
					})();
				}}
			/>
		);
	}

	const handleCloseReadDialog = async () => {
		await saveChanges();
		await retrieveIncrementalReadingSchedule();
		setShowReadDialog(false);
	};

	return (
		<>
			<div
				className={`${styles.verticalForm} ${styles.incrementalReadingCellBlock}`}>
				<TagRow>
					{schedule !== null && (
						<Tag
							icon={mdiClockOutline}
							text={
								schedule.completed
									? "Already completed"
									: `Due ${formatDueDate(schedule.nextReadingDate)}`
							}
							type={schedule.completed ? "green" : "primary"}
						/>
					)}
				</TagRow>
				<EditableCellInput
					type="text"
					placeholder="Title"
					value={incrementalReading.title!}
					onChange={e =>
						handleChange(() => ({ title: e.target.value }))
					}
					autoFocus={autofocus}
				/>

				<div
					className={styles.sourceLink}
					title={incrementalReading.source.url}>
					<Icon path={mdiWeb} size={0.78} className={styles.icon} />
					<span>{incrementalReading.source.url}</span>
				</div>

				{errorMessage && (
					<p className={styles.errorMessage}>{errorMessage}</p>
				)}

				<div className={styles.buttons}>
					<button
						className={`primary ${styles.rowButton}`}
						onClick={() => setShowReadDialog(true)}>
						<Icon path={mdiBookOpenVariantOutline} size={1} />
						<span>Read now</span>
					</button>
					{pendingExtractsCount !== null && (
						<button
							className={`transparent ${styles.rowButton}`}
							onClick={() => setShowExtractsDialog(true)}
							title="Go through pending extracts and convert them into cells"
							disabled={pendingExtractsCount === 0}>
							<Icon path={mdiCardsOutline} size={1} />
							<span>Extracts ({pendingExtractsCount})</span>
						</button>
					)}
				</div>
			</div>

			{showReadDialog && (
				<ReadDialog
					cellId={cell.id}
					incrementalReading={incrementalReading}
					onClose={() => void handleCloseReadDialog()}
					onChange={handleChange}
				/>
			)}

			{showExtractsDialog && (
				<ExtractsReviewDialog
					cells={[
						{ id: cell.id, title: incrementalReading.title ?? "" },
					]}
					onClose={handleCloseExtractDialog}
				/>
			)}
		</>
	);
}
