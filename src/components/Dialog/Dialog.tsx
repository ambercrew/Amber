import React, { useEffect, useRef } from "react";
import styles from "./styles.module.css";
import { FocusTrap } from "focus-trap-react";

interface Props {
	/** Should be true only when a dialog has a tabbable component.*/
	focusTrap: boolean;
	className?: string;
	children: React.ReactNode;
	fullScreenOnSmallDevices?: boolean;
	onHide?: () => void;
}

/** Shows a dialog with an overlay that handles the hide logic such as hiding
 * on overlay click, pressing Escape. Additionally it moves the focus to the
 * element that had the focus before the dialog was shown.
 */
export default function Dialog({
	className,
	children,
	focusTrap,
	fullScreenOnSmallDevices,
	onHide,
}: Props) {
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

	useEffect(() => {
		const focusedElement = focusedElementBeforeView;

		return () => {
			if (document.activeElement === document.body)
				focusedElement.current?.focus();
		};
	}, []);

	return (
		<FocusTrap
			active={focusTrap}
			focusTrapOptions={{
				tabbableOptions: {
					displayCheck:
						import.meta.env.MODE === "test" ? "none" : undefined,
				},
			}}>
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
					className={`${styles.box} ${fullScreenOnSmallDevices && styles.fullScreenOnSmallDevices} ${className}`}
					onClick={e => e.stopPropagation()}>
					{children}
				</div>
			</div>
		</FocusTrap>
	);
}
