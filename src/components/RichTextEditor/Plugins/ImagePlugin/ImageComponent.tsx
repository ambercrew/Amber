import styles from "../../styles.module.css";
import React, { useRef, useState } from "react";
import { NodeKey } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isImageNode } from "./ImageNode";

export default function ImageComponent({
	src,
	width,
	height,
	nodeKey,
}: {
	src: string;
	width: number;
	height: number;
	nodeKey: NodeKey;
}) {
	const [editor] = useLexicalComposerContext();
	const imgRef = useRef<HTMLImageElement>(null);
	const [isResizing, setIsResizing] = useState(false);
	const [currentWidth, setCurrentWidth] = useState(width);
	const [currentHeight, setCurrentHeight] = useState(height);
	const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

	const onResizeStart = (
		e: React.MouseEvent,
		direction: "se" | "sw" | "ne" | "nw",
	) => {
		e.preventDefault();
		setIsResizing(true);
		startPos.current = {
			x: e.clientX,
			y: e.clientY,
			width: currentWidth,
			height: currentHeight,
		};

		let newWidth = startPos.current.width;
		let newHeight = startPos.current.height;

		const onMouseMove = (moveEvent: MouseEvent) => {
			const deltaX = moveEvent.clientX - startPos.current.x;
			const deltaY = moveEvent.clientY - startPos.current.y;

			if (direction === "se") {
				newWidth = startPos.current.width + deltaX;
				newHeight = startPos.current.height + deltaY;
			} else if (direction === "sw") {
				newWidth = startPos.current.width - deltaX;
				newHeight = startPos.current.height + deltaY;
			} else if (direction === "ne") {
				newWidth = startPos.current.width + deltaX;
				newHeight = startPos.current.height - deltaY;
			} else if (direction === "nw") {
				newWidth = startPos.current.width - deltaX;
				newHeight = startPos.current.height - deltaY;
			}

			newWidth = Math.max(50, Math.min(800, newWidth));
			newHeight = Math.max(50, Math.min(800, newHeight));

			setCurrentWidth(newWidth);
			setCurrentHeight(newHeight);
		};

		const onMouseUp = () => {
			setIsResizing(false);

			editor.update(() => {
				const node = editor.getEditorState()._nodeMap.get(nodeKey);
				if ($isImageNode(node)) {
					console.log("in here", newWidth, newHeight);
					node.setWidthAndHeight(newWidth, newHeight);
				}
			});
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	};

	// TODO: maintain image ratio, top and right things on the style should be consistent with spacing
	return (
		<div className={styles.imageContainer}>
			<img
				ref={imgRef}
				src={src}
				style={{
					width: `${currentWidth}px`,
					height: `${currentHeight}px`,
					display: "block",
					cursor: isResizing ? "nwse-resize" : "default",
				}}
				draggable={false}
			/>
			{/* Resize handles */}
			<div
				style={{
					right: -4,
					bottom: -4,
					cursor: "nwse-resize",
				}}
				className={styles.resizeCircle}
				onMouseDown={e => onResizeStart(e, "se")}
			/>
			<div
				style={{
					cursor: "nesw-resize",
					left: -4,
					bottom: -4,
				}}
				className={styles.resizeCircle}
				onMouseDown={e => onResizeStart(e, "sw")}
			/>
			<div
				style={{
					right: -4,
					top: -4,
					cursor: "nesw-resize",
				}}
				className={styles.resizeCircle}
				onMouseDown={e => onResizeStart(e, "ne")}
			/>
			<div
				style={{
					left: -4,
					top: -4,
					cursor: "nwse-resize",
				}}
				className={styles.resizeCircle}
				onMouseDown={e => onResizeStart(e, "nw")}
			/>
		</div>
	);
}
