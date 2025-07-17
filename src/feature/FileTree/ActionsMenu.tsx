import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { useRef } from "react";
import useOutsideClick from "../../hooks/useOutsideClick";

export interface Action {
	iconName: string;
	text: string;
	shortcut?: string;
	onClick: () => void;
}

interface Props {
	actions: Action[];
	onOutsideClick?: () => void;
}

function ActionsMenu({ onOutsideClick, actions }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);

	// TODO: still shown when clicking on other dots
	useOutsideClick(
		containerRef as React.RefObject<HTMLElement>,
		onOutsideClick ??
			(() => {
				/* Do nothing */
			}),
	);

	return (
		<div className={`${styles.actionsMenu}`} ref={containerRef}>
			{actions.length > 0 &&
				actions.map((action, i) => (
					<button
						className="transparent"
						onClick={action.onClick}
						key={i}>
						<Icon path={action.iconName} size={1} />
						<span>{action.text}</span>
						<p className="dimmed">{action.shortcut}</p>
					</button>
				))}
			{actions.length === 0 && (
				<p className="dimmed">No available actions!</p>
			)}
		</div>
	);
}

export default ActionsMenu;
