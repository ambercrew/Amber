import { useCallback, useEffect, useState } from "react";
import { mdiCardsOutline, mdiPlayCircleOutline } from "@mdi/js";
import styles from "./styles.module.css";
import { CallApiFn } from "../../../hooks/useApi";
import CellWithPendingExtractsDto from "../../../api/incrementalReading/dto/cellWithPendingExtractsDto";
import { getCellsWithPendingExtracts } from "../../../api/incrementalReading/api/incrementalReadingApi";
import ExtractsReviewDialog, {
	CellToReview,
} from "../../ExtractsReview/components/ExtractsReviewDialog";
import ExtractsQueueRow from "./ExtractsQueueRow";
import BoxHeader from "./BoxHeader";

interface Props {
	callApi: CallApiFn;
	reloadToken: number;
	onReload: () => void;
}

export default function ExtractsQueue({
	callApi,
	reloadToken,
	onReload,
}: Props) {
	const [cells, setCells] = useState<CellWithPendingExtractsDto[]>([]);
	const [reviewCells, setReviewCells] = useState<CellToReview[] | null>(null);

	const fetchCells = useCallback(async () => {
		await callApi(async () =>
			setCells((await getCellsWithPendingExtracts()) ?? []),
		);
	}, [callApi]);

	useEffect(() => {
		void fetchCells();
	}, [fetchCells, reloadToken]);

	const handleClose = () => {
		setReviewCells(null);
		onReload();
	};

	return (
		<>
			<div className={styles.box}>
				<BoxHeader
					icon={mdiCardsOutline}
					title="Extracts queue"
					action={
						cells.length > 0
							? {
									icon: mdiPlayCircleOutline,
									label: "Convert",
									title: "Convert all pending extracts in all files into cards",
									onClick: () =>
										setReviewCells(
											cells.map(cell => ({
												id: cell.cellId,
												title: cell.title,
											})),
										),
								}
							: undefined
					}
				/>

				<div className={styles.mainContent}>
					{cells.length === 0 && (
						<div className={styles.row}>
							<p>No extracts to go through right now.</p>
						</div>
					)}

					{cells.map(cell => (
						<ExtractsQueueRow
							key={cell.cellId}
							cell={cell}
							onClick={() =>
								setReviewCells([
									{ id: cell.cellId, title: cell.title },
								])
							}
						/>
					))}
				</div>
			</div>

			{reviewCells && (
				<ExtractsReviewDialog
					cells={reviewCells}
					onClose={handleClose}
				/>
			)}
		</>
	);
}
