import React, { useEffect, useRef } from "react";
import styles from "./styles.module.css";

interface Props {
	className?: string;
	children: React.ReactNode;
	onHide?: () => void;
}

/** Shows a dialog with an overlay that handles the hide logic such as hiding
 * on overlay click, pressing Escape. Additionally it moves the focus to the
 * element that had the focus before the dialog was shown.
 */
export default function Dialog({ className, children, onHide }: Props) {
	const focusedElementBeforeView = useRef<HTMLElement | null>(
		document.activeElement instanceof HTMLElement
			? document.activeElement
			: null,
	);

	const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
		e.stopPropagation();
		if (e.key === "Escape") {
			if (onHide) onHide();
		}
	};

	// TODO: update tests
	useEffect(() => {
		const focusedElement = focusedElementBeforeView;

		return () => {
			if (document.activeElement === document.body)
				focusedElement.current?.focus();
		};
	}, []);

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
