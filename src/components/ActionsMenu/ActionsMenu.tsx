import { Icon } from "@mdi/react";
import styles from "./styles.module.css";
import React, { RefObject, useLayoutEffect, useRef } from "react";

export interface Action {
	iconName: string;
	text: string;
	shortcut?: string;
	onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

interface Props {
	actions: Action[];
	containerRef: RefObject<HTMLDivElement | null>;
	className?: string;
}

function ActionsMenu({ containerRef, actions, className }: Props) {
	const menuRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!containerRef.current || !menuRef.current) return;

		const menuRect = menuRef.current.getBoundingClientRect();
		const anchorRect = containerRef.current.getBoundingClientRect();
		const offsetParent = menuRef.current.offsetParent;
		const parentTop = offsetParent?.getBoundingClientRect().top ?? 0;

		let topPosition = anchorRect.bottom - parentTop;

		if (anchorRect.bottom + menuRect.height > window.innerHeight) {
			topPosition = anchorRect.top - parentTop - menuRect.height;
		}

		menuRef.current.style.top = topPosition + "px";
	}, [containerRef]);

	const hideShortcut = actions.every(a => !a.shortcut);

	return (
		<div
			className={`pop-over ${styles.actionsMenu} ${hideShortcut && styles.hideShortcuts} ${className}`}
			ref={menuRef}>
			{actions.length > 0 &&
				actions.map((action, i) => (
					<button
						className="transparent"
						onClick={e => action.onClick(e)}
						key={i}
						autoFocus={i === 0}>
						<Icon path={action.iconName} size={1} />
						<span title={action.shortcut}>{action.text}</span>
						{!hideShortcut && (
							<p className="dimmed" title={action.shortcut}>
								{action.shortcut}
							</p>
						)}
					</button>
				))}
			{actions.length === 0 && (
				<p className="dimmed">No available actions!</p>
			)}
		</div>
	);
}

export default ActionsMenu;
