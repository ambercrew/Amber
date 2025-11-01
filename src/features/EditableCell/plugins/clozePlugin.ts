import {
	$getSelection,
	$isRangeSelection,
	$isTextNode,
	COMMAND_PRIORITY_EDITOR,
	COMMAND_PRIORITY_NORMAL,
	createCommand,
	KEY_DOWN_COMMAND,
	LexicalCommand,
	LexicalNode,
	PointType,
	RangeSelection,
	TextNode,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { $wrapSelectionInMarkNode } from "@lexical/mark";
import {
	$createClozeNode,
	$isSelectionInsideCloze,
	$isClozeNode,
	ClozeNode,
} from "./clozeNode";

export const TOGGLE_CLOZE_NODE: LexicalCommand<void> = createCommand();
export const INCREASE_CLOZE_GROUP_NUMBER: LexicalCommand<void> =
	createCommand();
export const DECREASE_CLOZE_GROUP_NUMBER: LexicalCommand<void> =
	createCommand();

export function ClozePlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([ClozeNode])) {
			throw new Error("ClozeNode not registered on editor");
		}

		const unregisterToggleCloze = editor.registerCommand(
			TOGGLE_CLOZE_NODE,
			() => {
				editor.update(() => {
					const selection = $getSelection();
					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed()
					) {
						return;
					}

					if ($isSelectionInsideCloze(selection)) {
						$removeSelectionFromCloze(selection);
					} else {
						$wrapSelectionInCloze(selection);
					}
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);

		const unregisterIncreaseGroupNumber = editor.registerCommand(
			INCREASE_CLOZE_GROUP_NUMBER,
			() => {
				editor.update(() => {
					const selection = $getSelection();

					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed()
					) {
						return;
					}

					const cloze = $wrapSelectionInCloze(selection);
					cloze.index++;
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);

		const unregisterDecreaseGroupNumber = editor.registerCommand(
			DECREASE_CLOZE_GROUP_NUMBER,
			() => {
				editor.update(() => {
					const selection = $getSelection();

					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed()
					) {
						return;
					}

					const cloze = $wrapSelectionInCloze(selection);
					cloze.index = Math.max(cloze.index - 1, 1);
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);

		const unregisterKeyDown = editor.registerCommand(
			KEY_DOWN_COMMAND,
			event => {
				const { ctrlKey, metaKey, shiftKey, key } = event;

				if (
					(ctrlKey || metaKey) &&
					shiftKey &&
					key.toLowerCase() === "c"
				) {
					event.preventDefault();
					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
					return true;
				}

				return false;
			},
			COMMAND_PRIORITY_NORMAL,
		);

		return () => {
			unregisterToggleCloze();
			unregisterIncreaseGroupNumber();
			unregisterDecreaseGroupNumber();
			unregisterKeyDown();
		};
	}, [editor]);

	return null;
}

/** Wrap selections with a single cloze, if the selection contains one,
 * or more cloze already, they are merged into a single cloze.
 */
function $wrapSelectionInCloze(selection: RangeSelection): ClozeNode {
	skipWhitespace(selection);
	const allNodes: LexicalNode[] = [];
	let clozeIndex: number | null = null;

	for (const node of selection.extract()) {
		let current = node.getParent();
		let addedNode = false;

		while (current !== null) {
			if ($isClozeNode(current)) {
				addedNode = true;
				clozeIndex ??= current.index;
				allNodes.push(current);
				break;
			}

			current = current.getParent();
		}

		if (!addedNode) allNodes.push(node);
	}

	if (clozeIndex !== null) {
		const newClozeNode = $createClozeNode(clozeIndex);
		allNodes[0].insertBefore(newClozeNode);

		for (const node of allNodes) {
			if ($isClozeNode(node)) {
				const children = node.getChildren();
				for (const child of children) {
					newClozeNode.append(child);
				}
				node.remove();
			} else {
				newClozeNode.append(node);
			}
		}

		return newClozeNode;
	} else {
		const clozeNode = $createClozeNode(1);
		$wrapSelectionInMarkNode(
			selection,
			selection.isBackward(),
			"cloze",
			() => clozeNode,
		);
		return clozeNode;
	}
}

/**
 * Skips the whitespace from selection, ensuring that the selection does not
 * contain any leading or trailing whitespace.
 */
function skipWhitespace(selection: RangeSelection) {
	const [startPoint, endPoint] =
		getStartEndAndEndPointForSelection(selection);

	let currentStartNode = $isTextNode(startPoint.getNode())
		? startPoint.getNode()
		: null;
	let currentStartOffset = startPoint.offset;

	while (currentStartNode) {
		const textContent = currentStartNode.getTextContent();

		if (currentStartOffset < textContent.length) {
			const char = textContent[currentStartOffset];

			if (/\s/.test(char)) {
				currentStartOffset++;
			} else {
				break;
			}
		} else {
			const nextSibling = currentStartNode.getNextSibling();
			if (nextSibling) {
				currentStartNode = $isTextNode(nextSibling)
					? nextSibling
					: null;
				currentStartOffset = 0;
			} else {
				break;
			}
		}
	}

	let currentEndNode = $isTextNode(endPoint.getNode())
		? endPoint.getNode()
		: null;
	let currentEndOffset = endPoint.offset - 1;

	while (currentEndNode) {
		const textContent = currentEndNode.getTextContent();

		if (currentEndOffset >= 0) {
			const char = textContent[currentEndOffset] ?? " ";

			if (/\s/.test(char)) {
				currentEndOffset--;
			} else {
				break;
			}
		} else {
			const prevSibling = currentEndNode.getPreviousSibling();
			if (prevSibling) {
				currentEndNode = $isTextNode(prevSibling) ? prevSibling : null;
				currentEndOffset = prevSibling.getTextContent().length - 1;
			} else {
				break;
			}
		}
	}

	if (!currentStartNode || !currentEndNode) {
		return;
	}

	const isStartBeforeEnd =
		currentStartNode.isBefore(currentEndNode) ||
		(currentStartNode.is(currentEndNode) &&
			currentStartOffset < currentEndOffset);

	// If the selection is only white space the start of selection will be after
	// the end, therefore skipping any change.
	if (isStartBeforeEnd) {
		selection.setTextNodeRange(
			currentStartNode as TextNode,
			currentStartOffset,
			currentEndNode as TextNode,
			// Plus one to take the last character (should be non-whitespace).
			currentEndOffset + 1,
		);
	}
}

function $removeSelectionFromCloze(selection: RangeSelection) {
	const clozeNode = getClozeNode(selection);
	if (!clozeNode) return;

	const [startPoint, endPoint] =
		getStartEndAndEndPointForSelection(selection);
	const selectionNodes: LexicalNode[] = [];
	const afterSelectionClozeNode = $createClozeNode(clozeNode.index);

	// We have already passed selection if the start node is the cloze node.
	let passedSelectionStart = startPoint.getNode().is(clozeNode);
	let passedSelectionEnd = false;

	for (const child of clozeNode.getChildren()) {
		if (passedSelectionEnd) {
			afterSelectionClozeNode.append(child);
		} else if (
			!passedSelectionStart &&
			child.is(startPoint.getNode()) &&
			!passedSelectionEnd &&
			child.is(endPoint.getNode())
		) {
			passedSelectionStart = true;
			passedSelectionEnd = true;

			if ($isTextNode(child)) {
				const textNodes = child.splitText(
					startPoint.offset,
					endPoint.offset,
				);
				// Selected all texts.
				if (textNodes.length == 1) selectionNodes.push(textNodes[0]);
				// Text after selection start.
				if (textNodes.length > 1) selectionNodes.push(textNodes[1]);
				// Text after selection end.
				if (textNodes.length > 2)
					afterSelectionClozeNode.append(textNodes[2]);
			}
		} else if (!passedSelectionStart && child.is(startPoint.getNode())) {
			passedSelectionStart = true;

			if ($isTextNode(child)) {
				const textNodes = child.splitText(startPoint.offset);
				// Text after selection start.
				if (textNodes.length > 1) selectionNodes.push(textNodes[1]);
				// Selected everything.
				else if (
					textNodes.length == 1 &&
					startPoint.offset !== child.getTextContentSize()
				)
					selectionNodes.push(textNodes[0]);
			}
		} else if (!passedSelectionEnd && child.is(endPoint.getNode())) {
			passedSelectionEnd = true;

			if ($isTextNode(child)) {
				const textNodes = child.splitText(endPoint.offset);
				// Text before selection ends.
				if (textNodes.length > 0) selectionNodes.push(textNodes[0]);
				// Text after selection ends.
				if (textNodes.length > 1)
					afterSelectionClozeNode.append(textNodes[1]);
			}
		} else if (passedSelectionStart) {
			selectionNodes.push(child);
		}
	}

	if (!afterSelectionClozeNode.isEmpty())
		clozeNode.insertAfter(afterSelectionClozeNode);
	selectionNodes.reverse().forEach(node => clozeNode.insertAfter(node));
	if (clozeNode.isEmpty()) clozeNode.remove();
}

function getClozeNode(selection: RangeSelection): ClozeNode | null {
	let clozeNode: ClozeNode | null = null;
	for (const node of selection.getNodes()) {
		let current = node.getParent();
		while (current !== null) {
			if ($isClozeNode(current)) {
				clozeNode = current;
				break;
			}

			if (clozeNode) break;

			current = current.getParent();
		}
	}
	return clozeNode;
}

function getStartEndAndEndPointForSelection(
	selection: RangeSelection,
): [PointType, PointType] {
	return selection.isBackward()
		? [selection.focus, selection.anchor]
		: [selection.anchor, selection.focus];
}
