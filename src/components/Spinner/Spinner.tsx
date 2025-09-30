import styles from "./styles.module.css";

interface IProps {
	text?: string;
	size?: number;
}

export default function Spinner({ text, size = 1 }: IProps) {
	return (
		<div className={styles.container}>
			<span
				className={styles.spinner}
				style={{
					width: `${48 * size}px`,
					height: `${48 * size}px`,
				}}></span>
			{text && <p>{text}</p>}
		</div>
	);
}
