import React, { useState } from "react";
import styles from "./styles.module.css";

interface IProps {
	className?: string;
	children: React.ReactNode;
	onHide?: () => void;
}

/** Shows a dialog with an overlay that handles the hide logic such as hiding
 * on overlay click, pressing Escape. Additionally it moves the focus to the
 * element that had the focus before the dialog was shown.
 * If the children of the dialog is a form, and the dialog is not immediately
 * hidden after submit, stop the submit event propagation, otherwise the dialog,
 * might move the focus away!
 */
export default function Dialog({ className, children, onHide }: IProps) {
	const [focusedElementBeforeView, setFocusedElementBeforeView] =
		useState<HTMLElement | null>(null);

	if (
		document.activeElement !== null &&
		document.activeElement instanceof HTMLElement &&
		focusedElementBeforeView === null
	) {
		setFocusedElementBeforeView(document.activeElement);
	}

	const handleHide = () => {
		if (onHide) {
			focusedElementBeforeView?.focus();
			onHide();
		}
	};

	const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
		e.stopPropagation();
		if (e.key === "Escape") {
			handleHide();
		}
	};

	const handleSubmit = () => {
		// All submit calls are followed by closing the dialog.
		focusedElementBeforeView?.focus();
	};

	return (
		<div
			className={styles.overlay}
			onClick={e => {
				e.stopPropagation();
				handleHide();
			}}
			onKeyDown={e => e.stopPropagation()}
			onKeyUp={handleKeyUp}
			tabIndex={-1}
			onSubmit={handleSubmit}>
			<div
				className={`${styles.box} ${className}`}
				onClick={e => e.stopPropagation()}>
				{children}
			</div>
		</div>
	);
}
