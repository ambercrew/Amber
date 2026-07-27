/** Scrolls the nearest element ancestor of a match `Range` into view. */
export function scrollToRange(range: Range): void {
	const container = range.commonAncestorContainer;
	const element =
		container.nodeType === Node.ELEMENT_NODE
			? (container as Element)
			: container.parentElement;
	element?.scrollIntoView({ block: "center" });
}
