import { useRef } from "react";
import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import styles from "../Editor.module.css";

function isOnHandle(element: HTMLElement): boolean {
	return !!element.closest("[data-drag-handle]");
}

export function DragPlugin({ anchorElem }: { anchorElem: HTMLElement }) {
	const menuRef = useRef<HTMLDivElement>(null);
	const targetLineRef = useRef<HTMLDivElement>(null);

	return (
		<DraggableBlockPlugin_EXPERIMENTAL
			anchorElem={anchorElem}
			menuRef={menuRef}
			targetLineRef={targetLineRef}
			menuComponent={
				<div
					ref={menuRef}
					data-drag-handle
					draggable
					className={styles["drag-handle"]}>
					<DotsSixVerticalIcon size={20} />
				</div>
			}
			targetLineComponent={
				<div
					ref={targetLineRef}
					className={styles["drag-target-line"]}
				/>
			}
			isOnMenu={isOnHandle}
		/>
	);
}
