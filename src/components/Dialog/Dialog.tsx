import styles from "./styles.module.css";
import useGlobalKey from "../../hooks/useGlobalKey";

interface Props {
	className?: string;
	children: React.ReactNode;
	onHide?: () => void;
}

export default function Dialog({ className, children, onHide }: Props) {
	useGlobalKey(e => {
		if (e.key === "Escape" && onHide) {
			onHide();
		}
	});

	return (
		<div
			className={styles.overlay}
			onClick={e => {
				e.stopPropagation();
				if (onHide) onHide();
			}}>
			<div
				className={`${styles.box} ${className}`}
				onClick={e => e.stopPropagation()}>
				{children}
			</div>
		</div>
	);
}
