import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot } from "lexical";
import { useEffect, useRef } from "react";

// Small tolerance (px) so a block sitting flush *above* the fold — e.g. right
// after a programmatic scrollIntoView aligns the next block to the top — is not
// counted as the top-most visible block. Without it the boundary block drifts
// the saved index up by one on every restore.
const VISIBILITY_TOLERANCE_IN_PIXELS = 2;

interface Props {
	/* Block index to scroll to once when the editor first mounts. */
	initialBlockIndex?: number;
	/* Fired (throttled) as the user scrolls, with the top-most visible block index. */
	onPositionChange?: (blockIndex: number) => void;
}

// Walks up from the editor root and returns the first scrollable ancestor,
// falling back to the root element itself (which has overflow: auto).
function getScrollContainer(root: HTMLElement): HTMLElement {
	let current: HTMLElement | null = root;
	while (current) {
		const { overflowY } = getComputedStyle(current);
		const isScrollable = overflowY === "auto" || overflowY === "scroll";
		if (isScrollable && current.scrollHeight > current.clientHeight) {
			return current;
		}
		current = current.parentElement;
	}
	return root;
}

export default function ReadingPositionPlugin({
	initialBlockIndex,
	onPositionChange,
}: Props) {
	const [editor] = useLexicalComposerContext();
	// Last index handed to onPositionChange, so the scroll triggered by the
	// initial restore (and any redundant ticks) doesn't re-save the same value.
	const lastReportedIndex = useRef(-1);

	// Track the top-most visible block and report its index.
	useEffect(() => {
		const root = editor.getRootElement();
		if (!root) return;

		const container = getScrollContainer(root);
		let frame: number | null = null;

		const computeTopMostVisibleIndex = () => {
			frame = null;
			if (!onPositionChange) return;

			const containerTop =
				container === root.ownerDocument.documentElement ||
				container === root.ownerDocument.body
					? 0
					: container.getBoundingClientRect().top;

			const blocks = editor.getEditorState().read(() =>
				$getRoot()
					.getChildren()
					.map(node => node.getKey()),
			);

			for (let i = 0; i < blocks.length; i++) {
				const element = editor.getElementByKey(blocks[i]);
				if (!element) continue;
				// Using bottom (not top) so a block the user is only halfway
				// through still counts as the current one. The tolerance keeps
				// a block flush above the fold from being picked.
				if (
					element.getBoundingClientRect().bottom >
					containerTop + VISIBILITY_TOLERANCE_IN_PIXELS
				) {
					if (i !== lastReportedIndex.current) {
						lastReportedIndex.current = i;
						onPositionChange(i);
					}
					return;
				}
			}
		};

		const scheduleCompute = () => {
			if (frame !== null) return;
			frame = requestAnimationFrame(computeTopMostVisibleIndex);
		};

		container.addEventListener("scroll", scheduleCompute, {
			passive: true,
		});
		window.addEventListener("resize", scheduleCompute);

		return () => {
			if (frame !== null) cancelAnimationFrame(frame);
			container.removeEventListener("scroll", scheduleCompute);
			window.removeEventListener("resize", scheduleCompute);
		};
	}, [editor, onPositionChange]);

	// Restore the saved position once, after the editor has laid out.
	useEffect(() => {
		if (!initialBlockIndex) return;

		let cancelled = false;
		const frame = requestAnimationFrame(() => {
			if (cancelled) return;

			const blocks = editor.getEditorState().read(() =>
				$getRoot()
					.getChildren()
					.map(node => node.getKey()),
			);
			if (blocks.length === 0) return;

			const index = Math.min(initialBlockIndex, blocks.length - 1);
			const element = editor.getElementByKey(blocks[index]);
			element?.scrollIntoView({ block: "start" });
			// Seed the dedupe ref so the scroll event caused by this restore
			// reports the same index and is skipped instead of re-saving.
			lastReportedIndex.current = index;
		});

		return () => {
			cancelled = true;
			cancelAnimationFrame(frame);
		};

		// Restore only once, on mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editor]);

	return null;
}
