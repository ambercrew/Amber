import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	KEY_DOWN_COMMAND,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import FloatingMenu, {
	FloatingMenuCoordinates as FloatingMenuCoordinates,
} from "./FloatingMenu";
import { usePointerInteractions } from "./hooks/usePointerInteractions";
import { FloatingMenuButtonProps } from "./FloatingMenuButton";

interface Props {
	additionalFloatingMenuButtons?: FloatingMenuButtonProps[];
}

export function FloatingMenuPlugin({ additionalFloatingMenuButtons }: Props) {
	const [editor] = useLexicalComposerContext();
	const [coordinates, setCoordinates] =
		useState<FloatingMenuCoordinates>(null);
	const ref = useRef<HTMLDivElement>(null);

	const { isPointerDown, isPointerReleased } = usePointerInteractions();

	const calculatePosition = useCallback(() => {
		const domSelection = getSelection();
		const domRange =
			domSelection?.rangeCount !== 0
				? domSelection?.getRangeAt(0)?.cloneRange()
				: null;
		domRange?.collapse(domSelection?.direction === "backward");
		const domRangeRect = domRange?.getBoundingClientRect();
		const editorRootElementRect = editor
			.getRootElement()
			?.getBoundingClientRect();
		const refRect = ref.current?.getBoundingClientRect();

		if (
			!domRangeRect ||
			!refRect ||
			isPointerDown ||
			!editorRootElementRect
		) {
			return setCoordinates(null);
		}

		let x = Math.max(
			0,
			// Centering the x position relevant to the selection position,
			// and ensuring it does not overflow the left side.
			domRangeRect.left - editorRootElementRect.left - refRect.width / 2,
		);

		// Ensuring that the floating menu does not overflow the right side.
		if (x + refRect.width > editorRootElementRect.width) {
			x = editorRootElementRect.width - refRect.width;
		}
		const newCoordinates = {
			x,
			y: domRangeRect.top - editorRootElementRect.top - 10,
		};
		setCoordinates(newCoordinates);
	}, [editor, isPointerDown]);

	const $handleSelectionChange = useCallback(() => {
		if (
			editor.isComposing() ||
			editor.getRootElement() !== document.activeElement
		) {
			setCoordinates(null);
			return;
		}

		const selection = $getSelection();

		if (
			$isRangeSelection(selection) &&
			!selection.anchor.is(selection.focus)
		) {
			calculatePosition();
		} else {
			setCoordinates(null);
		}
	}, [editor, calculatePosition]);

	useEffect(() => {
		const unregisterListener = editor.registerUpdateListener(
			({ editorState }) => {
				editorState.read(() => $handleSelectionChange());
			},
		);
		return unregisterListener;
	}, [editor, $handleSelectionChange]);

	const show = coordinates !== null;
	useEffect(() => {
		if (!show && isPointerReleased) {
			editor.getEditorState().read(() => $handleSelectionChange());
		}
		// Adding show to the dependency array causes an issue if
		// a range selection is dismissed by navigating via arrow keys.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPointerReleased, $handleSelectionChange, editor]);

	useEffect(() => {
		return editor.registerCommand(
			KEY_DOWN_COMMAND,
			e => {
				// Only hide floating menu on escape press without losing focus.
				if (e.key === "Escape" && show) {
					setCoordinates(null);
					return true;
				}

				return false;
			},
			COMMAND_PRIORITY_LOW,
		);
	}, [editor, show]);

	// Handles key down inside the floating menu and outside the editor.
	const handleKeyDownFloatingMenu = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setCoordinates(null);
			editor.focus();
		}
	};

	return (
		<FloatingMenu
			ref={ref}
			editor={editor}
			coordinates={coordinates}
			additionalFloatingMenuButtons={additionalFloatingMenuButtons}
			onKeyDown={handleKeyDownFloatingMenu}
		/>
	);
}
