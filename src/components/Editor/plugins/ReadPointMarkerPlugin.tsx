import { useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeFromDOMNode, NodeKey } from "lexical";
import { Box, Tooltip } from "@mantine/core";
import { BookmarkSimpleIcon } from "@phosphor-icons/react";

interface ReadPointMarkerPluginProps {
	/** Index of the block (among the editor root's children) to mark. */
	blockIndex: number;
}

/**
 * Marks the reader's saved position beside a block in this split. Positioned
 * against the editor's own `position: relative` anchor (`root.parentElement`,
 * see `Editor.module.css`'s `.anchor`), so it needs no coordinates from
 * outside this editor instance — it re-measures on every editor update
 * (edits, reflow within this split) and on window resize.
 *
 * `blockIndex` only locates the block the first time; after that the block's
 * own Lexical node key is used, so the marker stays on that exact block even
 * if edits above it shift its index.
 */
export default function ReadPointMarkerPlugin({
	blockIndex,
}: ReadPointMarkerPluginProps) {
	const [editor] = useLexicalComposerContext();
	const [top, setTop] = useState<number | null>(null);
	const blockKeyRef = useRef<NodeKey | null>(null);

	useEffect(() => {
		blockKeyRef.current = null;
	}, [editor, blockIndex]);

	useEffect(() => {
		const measure = () => {
			const root = editor.getRootElement();
			const anchor = root?.parentElement;
			if (!root || !anchor) return;

			let block: HTMLElement | null = blockKeyRef.current
				? editor.getElementByKey(blockKeyRef.current)
				: null;

			if (!block) {
				block =
					(root.children[blockIndex] as HTMLElement | undefined) ??
					(root.children[root.children.length - 1] as
						HTMLElement | undefined) ??
					null;
				if (block) {
					const foundBlock = block;
					editor.getEditorState().read(
						() => {
							const node = $getNearestNodeFromDOMNode(foundBlock);
							if (node) blockKeyRef.current = node.getKey();
						},
						{ editor },
					);
				}
			}

			if (!block) return;
			setTop(
				block.getBoundingClientRect().top -
					anchor.getBoundingClientRect().top,
			);
		};

		measure();
		const unregisterUpdate = editor.registerUpdateListener(measure);
		window.addEventListener("resize", measure);
		return () => {
			unregisterUpdate();
			window.removeEventListener("resize", measure);
		};
	}, [editor, blockIndex]);

	if (top === null) return null;

	return (
		<Tooltip label="Read point" position="left" withArrow>
			<Box pos="absolute" top={top} right="100%" mr="xs">
				<BookmarkSimpleIcon size={22} />
			</Box>
		</Tooltip>
	);
}
