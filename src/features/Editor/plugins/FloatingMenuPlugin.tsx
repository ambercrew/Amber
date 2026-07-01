import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	BLUR_COMMAND,
	COMMAND_PRIORITY_LOW,
	FOCUS_COMMAND,
	KEY_DOWN_COMMAND,
	LexicalEditor,
	RangeSelection,
} from "lexical";
import { ActionIcon, Button, Group, Paper } from "@mantine/core";
import { isMobile } from "../../../utils/tauriUtils";
import styles from "../Editor.module.css";

export interface FloatingMenuButton {
	name: string;
	title: string;
	showLabel?: boolean;
	Icon: React.ComponentType<{ size?: number }>;
	onClick: (editor: LexicalEditor, isActive: boolean) => void;
	isActive: (selection: RangeSelection) => boolean;
	isVisible?: (selection: RangeSelection) => boolean;
}

interface Props {
	buttons: FloatingMenuButton[];
}

function usePointerInteractions() {
	const [isPointerDown, setIsPointerDown] = useState(false);
	const [isPointerReleased, setIsPointerReleased] = useState(true);

	useEffect(() => {
		const handlePointerUp = () => {
			setIsPointerDown(false);
			setIsPointerReleased(true);
			document.removeEventListener("pointerup", handlePointerUp);
		};
		const handlePointerDown = () => {
			setIsPointerDown(true);
			setIsPointerReleased(false);
			document.addEventListener("pointerup", handlePointerUp);
		};
		document.addEventListener("pointerdown", handlePointerDown);
		return () =>
			document.removeEventListener("pointerdown", handlePointerDown);
	}, []);

	return { isPointerDown, isPointerReleased };
}

export function FloatingMenuPlugin({ buttons }: Props) {
	const [editor] = useLexicalComposerContext();
	const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
	const [activeState, setActiveState] = useState<Record<string, boolean>>({});
	const [visibleState, setVisibleState] = useState<Record<string, boolean>>(
		{},
	);
	const [isEditorFocused, setIsEditorFocused] = useState(false);
	const [isMenuFocused, setIsMenuFocused] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const escapedRef = useRef(false);
	const mobile = isMobile();
	const { isPointerDown, isPointerReleased } = usePointerInteractions();

	const calculatePosition = useCallback(() => {
		const domSelection = getSelection();
		const originalRange =
			domSelection?.rangeCount !== 0 ? domSelection?.getRangeAt(0) : null;
		const domRange = originalRange?.cloneRange();
		domRange?.collapse(domSelection?.direction === "backward");
		let domRangeRect = domRange?.getBoundingClientRect();

		if (domRangeRect?.width === 0 && domRangeRect?.height === 0) {
			domRangeRect = originalRange?.getBoundingClientRect();
		}

		const editorRect = editor.getRootElement()?.getBoundingClientRect();
		if (!domRangeRect || isPointerDown || !editorRect) {
			return setCoords(null);
		}

		if (coords) return;

		requestAnimationFrame(() => {
			const menuRect = menuRef.current?.getBoundingClientRect();
			if (!menuRect) return;

			let x = Math.max(
				0,
				domRangeRect.left - editorRect.left - menuRect.width / 2,
			);
			if (x + menuRect.width > editorRect.width) {
				x = editorRect.width - menuRect.width;
			}

			setCoords({
				x,
				y: mobile
					? domRangeRect.bottom - editorRect.top + 10
					: domRangeRect.top - editorRect.top - 10,
			});
		});
	}, [editor, isPointerDown, mobile, coords]);

	const $handleSelectionChange = useCallback(() => {
		if (
			editor.isComposing() ||
			editor.getRootElement() !== document.activeElement
		) {
			setCoords(null);
			return;
		}

		const selection = $getSelection();
		if (
			$isRangeSelection(selection) &&
			!selection.anchor.is(selection.focus)
		) {
			if (!escapedRef.current) calculatePosition();
		} else {
			escapedRef.current = false;
			setCoords(null);
		}
	}, [editor, calculatePosition]);

	useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				$handleSelectionChange();

				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;

				const newActive: Record<string, boolean> = {};
				const newVisible: Record<string, boolean> = {};
				for (const btn of buttons) {
					newActive[btn.name] = btn.isActive(selection);
					newVisible[btn.name] = btn.isVisible
						? btn.isVisible(selection)
						: true;
				}
				setActiveState(newActive);
				setVisibleState(newVisible);
			});
		});
	}, [editor, $handleSelectionChange, buttons]);

	useEffect(() => {
		if (coords === null && isPointerReleased) {
			editor.getEditorState().read(() => $handleSelectionChange());
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPointerReleased, $handleSelectionChange, editor]);

	useEffect(() => {
		const unregisterBlur = editor.registerCommand(
			BLUR_COMMAND,
			() => {
				setIsEditorFocused(false);
				return false;
			},
			COMMAND_PRIORITY_LOW,
		);
		const unregisterFocus = editor.registerCommand(
			FOCUS_COMMAND,
			() => {
				setIsEditorFocused(true);
				return false;
			},
			COMMAND_PRIORITY_LOW,
		);
		return () => {
			unregisterBlur();
			unregisterFocus();
		};
	}, [editor]);

	useEffect(() => {
		return editor.registerCommand(
			KEY_DOWN_COMMAND,
			e => {
				if (e.key === "Escape" && coords !== null) {
					e.stopPropagation();
					escapedRef.current = true;
					setCoords(null);
					return true;
				}
				return false;
			},
			COMMAND_PRIORITY_LOW,
		);
	}, [editor, coords]);

	const shouldShow = (isEditorFocused || isMenuFocused) && coords !== null;

	return (
		<Paper
			ref={menuRef}
			withBorder
			shadow="md"
			p={4}
			className={styles["floating-menu"]}
			style={{
				top: coords?.y ?? 0,
				left: coords?.x ?? 0,
				transform: mobile ? "translateY(0)" : "translateY(-100%)",
				visibility: shouldShow ? "visible" : "hidden",
				opacity: shouldShow ? 1 : 0,
				pointerEvents: shouldShow ? "auto" : "none",
			}}
			onFocus={() => setIsMenuFocused(true)}
			onBlur={() => setIsMenuFocused(false)}
			onKeyDown={(e: React.KeyboardEvent) => {
				if (e.key === "Escape") {
					setCoords(null);
					editor.focus();
				}
			}}>
			<Group gap={2}>
				{buttons.map(btn =>
					visibleState[btn.name] === false ? null : btn.showLabel ? (
						<Button
							key={btn.name}
							variant={
								activeState[btn.name] ? "filled" : "subtle"
							}
							size="sm"
							leftSection={<btn.Icon size={18} />}
							title={btn.title}
							aria-label={btn.title}
							onMouseDown={(e: React.MouseEvent) =>
								e.preventDefault()
							}
							onClick={() =>
								btn.onClick(
									editor,
									activeState[btn.name] ?? false,
								)
							}>
							{btn.title}
						</Button>
					) : (
						<ActionIcon
							key={btn.name}
							variant={
								activeState[btn.name] ? "filled" : "subtle"
							}
							size="md"
							title={btn.title}
							aria-label={btn.title}
							onMouseDown={(e: React.MouseEvent) =>
								e.preventDefault()
							}
							onClick={() =>
								btn.onClick(
									editor,
									activeState[btn.name] ?? false,
								)
							}>
							<btn.Icon size={18} />
						</ActionIcon>
					),
				)}
			</Group>
		</Paper>
	);
}
