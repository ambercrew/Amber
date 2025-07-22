import { Rating, RecordLog } from "ts-fsrs";
import durationToString from "../utils/durationToString";
import styles from "./styles.module.css";

interface IProps {
	startTime: Date;
	disabled: boolean;
	onClick: (rating: Rating) => void;
	recordLog: RecordLog;
}

function ButtonRow({ startTime, disabled, recordLog, onClick }: IProps) {
	return (
		<div className={styles.buttonRow}>
			<div className={styles.buttonColumn}>
				<p>
					{durationToString(
						startTime,
						recordLog[Rating.Again].card.due,
					)}
				</p>
				<button
					className={styles.againButton}
					onClick={() => onClick(Rating.Again)}
					disabled={disabled}
					title="(1)">
					Again
				</button>
			</div>
			<div className={styles.buttonColumn}>
				<p>
					{durationToString(
						startTime,
						recordLog[Rating.Hard].card.due,
					)}
				</p>
				<button
					className={styles.hardButton}
					onClick={() => onClick(Rating.Hard)}
					disabled={disabled}
					title="(2)">
					Hard
				</button>
			</div>
			<div className={styles.buttonColumn}>
				<p>
					{durationToString(
						startTime,
						recordLog[Rating.Good].card.due,
					)}
				</p>
				<button
					className={styles.goodButton}
					onClick={() => onClick(Rating.Good)}
					disabled={disabled}
					title="(3)">
					Good
				</button>
			</div>
			<div className={styles.buttonColumn}>
				<p>
					{durationToString(
						startTime,
						recordLog[Rating.Easy].card.due,
					)}
				</p>
				<button
					className={styles.easyButton}
					onClick={() => onClick(Rating.Easy)}
					disabled={disabled}
					title="(4)">
					Easy
				</button>
			</div>
		</div>
	);
}

export default ButtonRow;
