import styles from "./styles.module.css";

interface Props {
	value: number;
}

export default function ProgressBar({ value }: Props) {
	return (
		<div className={styles.progressTrack}>
			<div
				className={styles.progressFill}
				style={{ width: `${value}%` }}
			/>
		</div>
	);
}
