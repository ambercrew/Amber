/** Scrolls the block at `block` (or the last block, if out of range) to the top of the viewport. */
export function scrollBlockIntoView(root: HTMLElement, block: number) {
	const target =
		root.children[block] ?? root.children[root.children.length - 1];
	target?.scrollIntoView({ block: "start" });
}
