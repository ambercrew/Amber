import { useMemo } from "react";
import { CellType } from "../../../api/cells/entities/cell";
import Repetition from "../../../api/cells/entities/repetition";
import styles from "./styles.module.css";
import repetitionsInfoFormatDate from "../utils/repetitionsInfoFormatDate";
import Popover from "../../../components/Popover/Popover";

interface Props {
	repetitions: Repetition[];
	cellType: CellType;
	onHide: () => void;
}

function RepetitionsInfo({ repetitions, cellType, onHide }: Props) {
	const sortedRepetitions = useMemo(() => {
		if (cellType !== "Cloze") return repetitions;
		return repetitions.sort(
			(a, b) =>
				Number(a.additionalContent ?? "0") -
				Number(b.additionalContent ?? "1"),
		);
	}, [repetitions, cellType]);

	return (
		<Popover
			className={styles.repetitionsInfoContainer}
			onHide={onHide}
			onClick={e => e.stopPropagation()}>
			{sortedRepetitions.map(repetition => (
				<div key={repetition.id}>
					{cellType === "Cloze" && (
						<strong>
							<p>Cloze Group: {repetition.additionalContent}</p>
						</strong>
					)}

					<p>Due: {repetitionsInfoFormatDate(repetition.due)}</p>
					<p>Stability: {repetition.stability.toFixed(1)}</p>
					<p>Difficulty: {repetition.difficulty.toFixed(1)}</p>
					<p>Learning steps: {repetition.learningSteps}</p>
					<p>Scheduled days: {repetition.scheduledDays}</p>
					<p>Reps: {repetition.reps}</p>
					<p>Lapses: {repetition.lapses}</p>
					<p>State: {repetition.state}</p>
					<p>
						Last review:{" "}
						{repetition.lastReview
							? repetitionsInfoFormatDate(repetition.lastReview)
							: "no review yet"}
					</p>
				</div>
			))}
		</Popover>
	);
}

export default RepetitionsInfo;
