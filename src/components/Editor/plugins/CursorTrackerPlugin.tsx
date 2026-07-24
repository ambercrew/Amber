import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";

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
 */
export default function CursorTrackerPlugin({
	onCursorMove,
}: CursorTrackerPluginProps) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerUpdateListener(({ editorState }) => {
			editorState.read(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				const blockIndex = selection.focus
					.getNode()
					.getTopLevelElementOrThrow()
					.getIndexWithinParent();
				onCursorMove(blockIndex);
			});
		});
	}, [editor, onCursorMove]);

	return null;
}
