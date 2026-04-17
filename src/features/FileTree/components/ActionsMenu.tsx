import { Icon } from "@mdi/react";
import styles from "./styles.module.css";
import { RefObject, useLayoutEffect, useRef } from "react";
import { Action } from "../types/action";

interface Props {
	actions: Action[];
	fileTreeItemRowContainer: RefObject<HTMLDivElement | null>;
}

function ActionsMenu({ fileTreeItemRowContainer, actions }: Props) {
	const containerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!fileTreeItemRowContainer.current || !containerRef.current) return;

		const containerRect = containerRef.current.getBoundingClientRect();
		const itemTreeRect =
			fileTreeItemRowContainer.current.getBoundingClientRect();
		let topPosition = itemTreeRect.top + itemTreeRect.height;

		if (topPosition + containerRect.height > window.innerHeight) {
			topPosition -= itemTreeRect.height ?? 0;
			topPosition -= containerRect.height ?? 0;
		}

		containerRef.current.style.top = topPosition + "px";
	}, [fileTreeItemRowContainer, containerRef]);

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
