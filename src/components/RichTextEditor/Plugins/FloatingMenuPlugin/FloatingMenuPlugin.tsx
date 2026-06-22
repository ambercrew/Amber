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
import { isMobile } from "../../../../utils/tauriUtils";

interface Props {
	additionalFloatingMenuButtons?: FloatingMenuButtonProps[];
}

export function FloatingMenuPlugin({ additionalFloatingMenuButtons }: Props) {
	const [editor] = useLexicalComposerContext();
	const [coordinates, setCoordinates] =
		useState<FloatingMenuCoordinates>(null);
	const ref = useRef<HTMLDivElement>(null);
	const mobile = isMobile();

	const { isPointerDown, isPointerReleased } = usePointerInteractions();
	const escapedRef = useRef(false);

	const calculatePosition = useCallback(() => {
		const domSelection = getSelection();
		const originalRange =
			domSelection?.rangeCount !== 0 ? domSelection?.getRangeAt(0) : null;
		const domRange = originalRange?.cloneRange();
		domRange?.collapse(domSelection?.direction === "backward");
		let domRangeRect = domRange?.getBoundingClientRect();

		// A collapsed range at an element node boundary
		// returns an empty rect. Fall back to the full selection rect so the menu
		// still appears for right-to-left and select-all selections.
		if (domRangeRect?.width === 0 && domRangeRect?.height === 0) {
			domRangeRect = originalRange?.getBoundingClientRect();
		}
		const editorRootElementRect = editor
			.getRootElement()
			?.getBoundingClientRect();

		if (!domRangeRect || isPointerDown || !editorRootElementRect) {
			return setCoordinates(null);
		}

		// Do not move the floating menu if it is already shown.
		if (coordinates) return;

		// Defer measuring the menu's width to the next animation frame.
		// The menu's button visibility (and therefore its width) is
		// recalculated by FloatingMenu's own update listener in this same
		// editor update, so the DOM hasn't been re-rendered with the final
		// set of buttons yet — measuring refRect synchronously here would
		// pick up a stale width.
		requestAnimationFrame(() => {
			const refRect = ref.current?.getBoundingClientRect();
			if (!refRect) return;

			let x = Math.max(
				0,
				// Centering the x position relevant to the selection position,
				// and ensuring it does not overflow the left side.
				domRangeRect.left -
					editorRootElementRect.left -
					refRect.width / 2,
			);

			// Ensuring that the floating menu does not overflow the right side.
			if (x + refRect.width > editorRootElementRect.width) {
				x = editorRootElementRect.width - refRect.width;
			}
			setCoordinates({
				x,
				y: mobile
					? domRangeRect.bottom - editorRootElementRect.top + 10
					: domRangeRect.top - editorRootElementRect.top - 10,
			});
		});
	}, [editor, isPointerDown, mobile, coordinates]);

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
			if (!escapedRef.current) {
				calculatePosition();
			}
		} else {
			escapedRef.current = false;
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
					e.stopPropagation();
					escapedRef.current = true;
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
			positionBelow={mobile}
			additionalFloatingMenuButtons={additionalFloatingMenuButtons}
			onKeyDown={handleKeyDownFloatingMenu}
		/>
	);
}
