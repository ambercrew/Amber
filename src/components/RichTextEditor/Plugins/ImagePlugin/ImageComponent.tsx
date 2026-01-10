import styles from "../../styles.module.css";
import React, { useRef, useState } from "react";
import { NodeKey } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isImageNode } from "./ImageNode";
import useOutsideClick from "../../../../hooks/useOutsideClick";

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
	const [showResize, setShowResize] = useState(false);
	const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });
	const containerRef = useRef<HTMLDivElement | null>(null);

	useOutsideClick(containerRef as React.RefObject<HTMLElement>, () =>
		setShowResize(false),
	);

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
			let deltaX = moveEvent.clientX - startPos.current.x;
			let deltaY = moveEvent.clientY - startPos.current.y;

			if (direction === "sw") {
				deltaX *= -1;
			} else if (direction === "ne") {
				deltaY *= -1;
			} else if (direction === "nw") {
				deltaX *= -1;
				deltaY *= -1;
			}

			const scaleFactor =
				1 +
				(deltaX / startPos.current.width +
					deltaY / startPos.current.height) /
					2;

			newWidth = Math.max(12, startPos.current.width * scaleFactor);
			newHeight = Math.max(12, startPos.current.height * scaleFactor);

			// Making sure that aspect ratio is still the same after clipping to
			// minimum width and height.
			const aspectRatio =
				startPos.current.width / startPos.current.height;
			newHeight = newWidth / aspectRatio;

			setCurrentWidth(newWidth);
			setCurrentHeight(newHeight);
		};

		const onMouseUp = () => {
			setIsResizing(false);

			editor.update(() => {
				const node = editor.getEditorState()._nodeMap.get(nodeKey);
				if ($isImageNode(node)) {
					node.setWidthAndHeight(newWidth, newHeight);
				}
			});
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	};

	return (
		<div
			className={styles.imageContainer}
			ref={containerRef}
			onClick={() => setShowResize(true)}>
			{src && (
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
			)}
			{showResize && (
				<>
					<div
						className={`${styles.resizeCircle} ${styles.bottomRight}`}
						onMouseDown={e => onResizeStart(e, "se")}
					/>
					<div
						className={`${styles.resizeCircle} ${styles.bottomLeft}`}
						onMouseDown={e => onResizeStart(e, "sw")}
					/>
					<div
						className={`${styles.resizeCircle} ${styles.topRight}`}
						onMouseDown={e => onResizeStart(e, "ne")}
					/>
					<div
						className={`${styles.resizeCircle} ${styles.topLeft}`}
						onMouseDown={e => onResizeStart(e, "nw")}
					/>
				</>
			)}
		</div>
	);
}
