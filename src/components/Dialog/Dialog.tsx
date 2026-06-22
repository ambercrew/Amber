import { Options as FocusTrapOptions } from "focus-trap";
import React from "react";
import styles from "./styles.module.css";
import { FocusTrap } from "focus-trap-react";
import useBackButtonPress from "../../hooks/useBackButtonPress";
import useFocusRestore from "../../hooks/useFocusRestore";

interface Props {
	/** Should be true only when a dialog has a tabbable component.*/
	focusTrap: boolean;
	className?: string;
	children: React.ReactNode;
	fullScreenOnSmallDevices?: boolean;
	focusTrapOptions?: FocusTrapOptions;
	onHide?: () => void;
}

/** Shows a dialog with an overlay that handles the hide logic such as hiding
 * on overlay click, pressing Escape, or Android back button. Additionally it
 * moves the focus to the element that had the focus before the dialog was shown.
 */
export default function Dialog({
	className,
	children,
	focusTrap,
	fullScreenOnSmallDevices,
	focusTrapOptions,
	onHide,
}: Props) {
	useFocusRestore();

	const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
		e.stopPropagation();
		if (e.key === "Escape" && onHide) {
			onHide();
		}
	};

	useBackButtonPress(
		onHide ??
			(() => {
				/* Empty */
			}),
	);

	return (
		<FocusTrap
			active={focusTrap}
			focusTrapOptions={{
				tabbableOptions: {
					displayCheck:
						import.meta.env.MODE === "test" ? "none" : undefined,
				},
				...focusTrapOptions,
			}}>
			<div
				className={styles.overlay}
				onKeyDown={e => e.stopPropagation()}
				onKeyUp={handleKeyUp}
				tabIndex={-1}>
				<div
					className={`${styles.box} ${fullScreenOnSmallDevices && styles.fullScreenOnSmallDevices} ${className}`}>
					{children}
				</div>
			</div>
		</FocusTrap>
	);
}
