import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getNearestNodeFromDOMNode,
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
} from "lexical";

interface CursorTrackerPluginProps {
	/** Called with the top-level block index containing the caret. */
	onCursorMove: (blockIndex: number) => void;
}

/**
 * Reports the block index containing the caret whenever the selection
 * changes. Lexical keeps the last selection in its editor state even after
 * the editor blurs (e.g. focus moves to the command palette), so the last
 * value reported here still reflects where the caret was, rather than
 * wherever focus happens to be at the time a caller reads it.
 *
 * Also handles `NodeSelection` (e.g. clicking an image, which never produces
 * a caret) so that right-clicking a non-text node still tracks its block.
 */
export default function CursorTrackerPlugin({
	onCursorMove,
}: CursorTrackerPluginProps) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection)) {
					const blockIndex = selection.focus
						.getNode()
						.getTopLevelElementOrThrow()
						.getIndexWithinParent();
					onCursorMove(blockIndex);
					return;
				}
				if ($isNodeSelection(selection)) {
					const node = selection.getNodes()[0];
					if (!node) return;
					const blockIndex = node
						.getTopLevelElementOrThrow()
						.getIndexWithinParent();
					onCursorMove(blockIndex);
				}
			});
		});
	}, [editor, onCursorMove]);

	// Right-clicking a decorator node (e.g. an image) opens the context menu
	// without moving the Lexical selection at all — no click precedes it, so
	// the update listener above never fires. Track the block under the
	// pointer directly from the native contextmenu event instead.
	useEffect(() => {
		function handleContextMenu(event: MouseEvent) {
			editor.read(() => {
				const node = $getNearestNodeFromDOMNode(event.target as Node);
				if (!node) return;
				const blockIndex = node
					.getTopLevelElementOrThrow()
					.getIndexWithinParent();
				onCursorMove(blockIndex);
			});
		}

		return editor.registerRootListener((rootElement, prevRootElement) => {
			prevRootElement?.removeEventListener(
				"contextmenu",
				handleContextMenu,
			);
			rootElement?.addEventListener("contextmenu", handleContextMenu);
		});
	}, [editor, onCursorMove]);

	return null;
}
