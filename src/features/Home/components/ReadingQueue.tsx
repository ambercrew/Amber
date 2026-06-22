import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./styles.module.css";
import { CallApiFn } from "../../../hooks/useApi";
import DueIncrementalReadingDto from "../../../api/incrementalReading/dto/dueIncrementalReadingDto";
import { getDueIncrementalReadings } from "../../../api/incrementalReading/api/incrementalReadingApi";
import {
	getCellById,
	updateCellsContents,
} from "../../../api/cells/api/cellApi";
import ReadDialog from "../../IncrementalReading/components/ReadDialog";
import IncrementalReading from "../../../api/cells/valueObjects/incrementalReading";
import ReadingQueueRow from "./ReadingQueueRow";
import BoxHeader from "./BoxHeader";
import getCellIcon from "../../../utils/getCellIcon";

interface Props {
	callApi: CallApiFn;
	reloadToken: number;
	onReload: () => void;
}

interface ActiveReading {
	cellId: string;
	incrementalReading: IncrementalReading;
}

export default function ReadingQueue({
	callApi,
	reloadToken,
	onReload,
}: Props) {
	const [readings, setReadings] = useState<DueIncrementalReadingDto[]>([]);
	const [activeReading, setActiveReading] = useState<ActiveReading | null>(
		null,
	);

	// Mirror the active reading in a ref so onChange's updates are visible to
	// onClose synchronously. Usefull for anything that changes the state then
	// closes the dialog synchronously.
	const activeReadingRef = useRef<ActiveReading | null>(null);

	const updateActiveReading = (next: ActiveReading | null) => {
		activeReadingRef.current = next;
		setActiveReading(next);
	};

	const fetchReadings = useCallback(async () => {
		await callApi(async () =>
			setReadings((await getDueIncrementalReadings()) ?? []),
		);
	}, [callApi]);

	useEffect(() => {
		void fetchReadings();
	}, [fetchReadings, reloadToken]);

	const handleOpen = (cellId: string) => {
		void callApi(async () => {
			const cell = await getCellById(cellId);
			const incrementalReading = JSON.parse(
				cell.content,
			) as IncrementalReading;
			updateActiveReading({ cellId, incrementalReading });
		});
	};

	const handleChange = (
		updater: (current: IncrementalReading) => Partial<IncrementalReading>,
	) => {
		const current = activeReadingRef.current;
		if (current === null) return;

		updateActiveReading({
			...current,
			incrementalReading: {
				...current.incrementalReading,
				...updater(current.incrementalReading),
			},
		});
	};

	const handleClose = () => {
		const current = activeReadingRef.current;
		updateActiveReading(null);
		if (current === null) return;

		void callApi(async () => {
			await updateCellsContents([
				{
					id: current.cellId,
					content: JSON.stringify(current.incrementalReading),
				},
			]);
			onReload();
		});
	};

	return (
		<>
			<div className={styles.box}>
				<BoxHeader
					icon={getCellIcon("IncrementalReading")}
					title="Reading queue"
				/>

				<div className={styles.mainContent}>
					{readings.length === 0 && (
						<div className={styles.row}>
							<p>No readings are due right now.</p>
						</div>
					)}

					{readings.map(reading => (
						<ReadingQueueRow
							key={reading.cellId}
							reading={reading}
							onClick={() => handleOpen(reading.cellId)}
						/>
					))}
				</div>
			</div>

			{activeReading && (
				<ReadDialog
					cellId={activeReading.cellId}
					incrementalReading={activeReading.incrementalReading}
					onChange={handleChange}
					onClose={handleClose}
				/>
			)}
		</>
	);
}
