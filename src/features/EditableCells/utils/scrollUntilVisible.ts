/**
 * This function ensure that the top border and the bottom border of the child
 * are visible by scrolling the parent until they are visible.
 */
function scrollUntilVisible(
	parentElement: HTMLElement,
	childElement: HTMLElement,
) {
	const parentRect = parentElement.getBoundingClientRect();
	const childRect = childElement.getBoundingClientRect();

	if (0 > childRect.top - parentRect.top) {
		childElement.scrollIntoView(true);
	}

	if (0 < childRect.bottom - parentRect.bottom) {
		childElement.scrollIntoView(false);
	}
}

export default scrollUntilVisible;
