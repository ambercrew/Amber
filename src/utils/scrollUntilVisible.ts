/**
 * This function ensure that the top border and the bottom border of the child
 * are visible by scrolling the parent until they are visible.
 */
function scrollUntilVisible(
	parentElement: Element,
	childElement: Element,
	offset = 0,
) {
	const parentRect = parentElement.getBoundingClientRect();
	const childRect = childElement.getBoundingClientRect();

	const childRelativeTop =
		childRect.top - parentRect.top + parentElement.scrollTop;
	if (parentElement.scrollTop > childRelativeTop - offset) {
		parentElement.scrollTop = childRelativeTop - offset;
	}

	const childBottom =
		childRect.bottom - parentRect.top + parentElement.scrollTop;
	const parentVisibleBottom =
		parentElement.scrollTop + parentElement.clientHeight;
	if (childBottom + offset > parentVisibleBottom) {
		parentElement.scrollTop =
			childBottom - parentElement.clientHeight + offset;
	}
}

export default scrollUntilVisible;
