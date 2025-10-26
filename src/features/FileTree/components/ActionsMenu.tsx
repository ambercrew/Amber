import Icon from "@mdi/react";
import styles from "./styles.module.css";
import { RefObject, useLayoutEffect, useRef, useState } from "react";
import { Action } from "../types/action";

interface Props {
	actions: Action[];
	fileTreeItemRowContainer: RefObject<HTMLDivElement | null>;
}

function ActionsMenu({ fileTreeItemRowContainer, actions }: Props) {
	const [topPosition, setTopPosition] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!fileTreeItemRowContainer.current || !containerRef.current) return;

		const containerRect = containerRef.current.getBoundingClientRect();
		const itemTreeRect =
			fileTreeItemRowContainer.current.getBoundingClientRect();
		let newTopPosition = itemTreeRect.top + itemTreeRect.height;

		if (newTopPosition + containerRect.height > window.innerHeight) {
			newTopPosition -= itemTreeRect.height ?? 0;
			newTopPosition -= containerRect.height ?? 0;
		}

		// eslint-disable-next-line react-hooks/set-state-in-effect
		setTopPosition(newTopPosition);
	}, [fileTreeItemRowContainer, containerRef]);

	return (
		<div
			className={`${styles.actionsMenu}`}
			style={{ top: topPosition + "px" }}
			ref={containerRef}>
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
