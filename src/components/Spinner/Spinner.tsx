import styles from "./styles.module.css";

interface Props {
	text?: string;
	size?: number;
	containerClassName?: string;
}

export default function Spinner({ text, containerClassName, size = 1 }: Props) {
	return (
		<div className={`${styles.container} ${containerClassName}`}>
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
