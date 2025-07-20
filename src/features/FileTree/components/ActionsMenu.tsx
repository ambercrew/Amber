import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { useRef } from "react";
import { Action } from "../types/action";

interface Props {
	actions: Action[];
}

function ActionsMenu({ actions }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);

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
