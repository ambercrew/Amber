import { Grade, Rating, RecordLog } from "ts-fsrs";
import durationToString from "../utils/durationToString";
import styles from "./styles.module.css";

interface Props {
	startTime: Date;
	disabled: boolean;
	onClick: (grade: Grade) => void;
	recordLog: RecordLog;
}

function ButtonRow({ startTime, disabled, recordLog, onClick }: Props) {
	return (
		<div className={styles.buttonRow}>
			<button
				className={`${styles.againButton} ${styles.gradeButton}`}
				onClick={() => onClick(Rating.Again)}
				disabled={disabled}
				title="(1)">
				<span className={styles.gradeName}>Again</span>
				<span className={styles.gradeTime}>
					{durationToString(
						startTime,
						recordLog[Rating.Again].card.due,
					)}
				</span>
			</button>
			<button
				className={`${styles.hardButton} ${styles.gradeButton}`}
				onClick={() => onClick(Rating.Hard)}
				disabled={disabled}
				title="(2)">
				<span className={styles.gradeName}>Hard</span>
				<span className={styles.gradeTime}>
					{durationToString(
						startTime,
						recordLog[Rating.Hard].card.due,
					)}
				</span>
			</button>
			<button
				className={`${styles.goodButton} ${styles.gradeButton}`}
				onClick={() => onClick(Rating.Good)}
				disabled={disabled}
				title="(3)">
				<span className={styles.gradeName}>Good</span>
				<span className={styles.gradeTime}>
					{durationToString(
						startTime,
						recordLog[Rating.Good].card.due,
					)}
				</span>
			</button>
			<button
				className={`${styles.easyButton} ${styles.gradeButton}`}
				onClick={() => onClick(Rating.Easy)}
				disabled={disabled}
				title="(4)">
				<span className={styles.gradeName}>Easy</span>
				<span className={styles.gradeTime}>
					{durationToString(
						startTime,
						recordLog[Rating.Easy].card.due,
					)}
				</span>
			</button>
		</div>
	);
}

export default ButtonRow;
