import { useMemo } from "react";
import { CellType } from "../../type/backend/entity/cell";
import Repetition from "../../type/backend/entity/repetition";
import styles from "./styles.module.css";

interface Props {
	repetitions: Repetition[];
	cellType: CellType;
}

function formatDate(dateString: string) {
	const date = new Date(dateString);
	return (
		`${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ` +
		`${date.getHours()}:${date.getMinutes()}`
	);
}

function RepetitionsInfo({ repetitions, cellType }: Props) {
	const sortedRepetitions = useMemo(() => {
		if (cellType !== "Cloze") return repetitions;
		return repetitions.sort(
			(a, b) =>
				Number(a.additionalContent ?? "0") -
				Number(b.additionalContent ?? "1"),
		);
	}, [repetitions, cellType]);

	return (
		<div
			className={styles.repetitionsInfoContainer}
			onClick={e => e.stopPropagation()}>
			{sortedRepetitions.map(repetition => (
				<div key={repetition.id}>
					{cellType === "Cloze" && (
						<strong>
							<p>Cloze Group: {repetition.additionalContent}</p>
						</strong>
					)}

					<p>Due: {formatDate(repetition.due)}</p>
					<p>Stability: {repetition.stability.toFixed(1)}</p>
					<p>Difficulty: {repetition.difficulty.toFixed(1)}</p>
					<p>Elapsed days: {repetition.elapsedDays}</p>
					<p>Scheduled days: {repetition.scheduledDays}</p>
					<p>Reps: {repetition.reps}</p>
					<p>Lapses: {repetition.lapses}</p>
					<p>State: {repetition.state}</p>
					<p>Last review: {formatDate(repetition.lastReview)}</p>
				</div>
			))}
		</div>
	);
}

export default RepetitionsInfo;
