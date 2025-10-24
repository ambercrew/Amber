import React from "react";
import styles from "./styles.module.css";

interface Props {
	className?: string;
	children: React.ReactNode;
	onHide?: () => void;
}

export default function Dialog({ className, children, onHide }: Props) {
	const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
		e.stopPropagation();
		if (e.key === "Escape" && onHide) {
			onHide();
		}
	};

	return (
		<div
			className={styles.overlay}
			onClick={e => {
				e.stopPropagation();
				if (onHide) onHide();
			}}
			onKeyDown={e => e.stopPropagation()}
			onKeyUp={handleKeyUp}
			tabIndex={-1}>
			<div
				className={`${styles.box} ${className}`}
				onClick={e => e.stopPropagation()}>
				{children}
			</div>
		</div>
	);
}
