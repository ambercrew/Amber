import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_EDITOR,
} from "lexical";
import { $wrapSelectionInMarkNode } from "@lexical/mark";
import { $generateHtmlFromNodes } from "@lexical/html";
import { $createHighlightNode, HighlightNode } from "./HighlightNode";
import {
	CREATE_HIGHLIGHT_COMMAND,
	HighlightCreatedPayload,
} from "./highlightCommands";

interface Props {
	onHighlightCreated?: (payload: HighlightCreatedPayload) => void;
}

export function HighlightPlugin({ onHighlightCreated }: Props) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([HighlightNode])) {
			throw new Error(
				"HighlightPlugin: HighlightNode not registered in editor",
			);
		}
		return editor.registerCommand(
			CREATE_HIGHLIGHT_COMMAND,
			color => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection) || selection.isCollapsed()) {
					return false;
				}
				const text = selection.getTextContent();
				if (!text?.trim()) return false;

				const html = $generateHtmlFromNodes(editor, selection);
				// Whichever point comes later in document order is the end of
				// the extracted range, regardless of which way the user dragged.
				const endPoint = selection.isBackward()
					? selection.anchor
					: selection.focus;
				const endBlockIndex = endPoint
					.getNode()
					.getTopLevelElementOrThrow()
					.getIndexWithinParent();

				const id = crypto.randomUUID();
				$wrapSelectionInMarkNode(
					selection,
					selection.isBackward(),
					id,
					ids => $createHighlightNode(ids, color),
				);
				const fullHtml = $generateHtmlFromNodes(editor);
				onHighlightCreated?.({
					id,
					html,
					fullHtml,
					color,
					endBlockIndex,
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);
	}, [editor, onHighlightCreated]);

	return null;
}
