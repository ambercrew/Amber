import {
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_EDITOR,
	COMMAND_PRIORITY_NORMAL,
	createCommand,
	KEY_DOWN_COMMAND,
	LexicalCommand,
	RangeSelection,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import {
	$createHighlightNode,
	$isHighlightNode,
	$isSelectionInsideHighlight,
	HighlightNode,
} from "./highlightNode";
import {
	$removeSelectionFromNode,
	$wrapSelectionInNode,
} from "../../../../../components/RichTextEditor/Plugins/utils/selectionWrapUtils";
import { isModKey } from "../../../../../utils/keyboardUtils";

export const HIGHLIGHT_SHORTCUT_KEY = "h";

export const TOGGLE_HIGHLIGHT_NODE: LexicalCommand<void> = createCommand();

export function HighlightPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([HighlightNode])) {
			throw new Error("HighlightNode not registered on editor");
		}

		const unregisterToggleHighlight = editor.registerCommand(
			TOGGLE_HIGHLIGHT_NODE,
			() => {
				editor.update(() => {
					const selection = $getSelection();
					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed()
					) {
						return;
					}

					if ($isSelectionInsideHighlight(selection)) {
						$removeSelectionFromHighlight(selection);
					} else {
						$wrapSelectionInHighlight(selection);
					}
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);

		const unregisterKeyDown = editor.registerCommand(
			KEY_DOWN_COMMAND,
			event => {
				if (
					isModKey(event) &&
					event.shiftKey &&
					event.key.toLowerCase() === HIGHLIGHT_SHORTCUT_KEY
				) {
					event.preventDefault();
					editor.dispatchCommand(TOGGLE_HIGHLIGHT_NODE, undefined);
					return true;
				}
				return false;
			},
			COMMAND_PRIORITY_NORMAL,
		);

		return () => {
			unregisterToggleHighlight();
			unregisterKeyDown();
		};
	}, [editor]);

	return null;
}

function $wrapSelectionInHighlight(selection: RangeSelection): HighlightNode {
	return $wrapSelectionInNode(selection, $isHighlightNode, existing =>
		$createHighlightNode(existing?.id),
	);
}

function $removeSelectionFromHighlight(selection: RangeSelection) {
	$removeSelectionFromNode(selection, $isHighlightNode, existing =>
		$createHighlightNode(existing.id),
	);
}
