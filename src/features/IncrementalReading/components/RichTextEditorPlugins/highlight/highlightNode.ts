import { DOMExportOutput, LexicalNode, NodeKey, RangeSelection } from "lexical";
import { MarkNode } from "@lexical/mark";
import {
	$getNodesOfTypeFromSelection,
	$isSelectionInsideNode,
} from "../../../../../components/RichTextEditor/Plugins/utils/selectionWrapUtils";

const HIGHLIGHT_CSS_CLASS_NAME = "highlight-node";
const HIGHLIGHT_ID_ATTRIBUTE_NAME = "highlight-id";
export const HIGHLIGHT_TAG_NAME = "highlight";

export class HighlightNode extends MarkNode {
	id: string;

	constructor(key: NodeKey | undefined = undefined) {
		super(undefined, key);
		this.id = crypto.randomUUID();
	}

	canInsertTextBefore() {
		return true as unknown as false;
	}

	canInsertTextAfter() {
		return true as unknown as false;
	}

	static clone(node: HighlightNode): MarkNode {
		const clone = $createHighlightNode(node.id);
		clone.__key = node.__key;
		return clone;
	}

	createDOM(): HTMLElement {
		const element = document.createElement(HIGHLIGHT_TAG_NAME);
		element.classList.add(HIGHLIGHT_CSS_CLASS_NAME);
		element.setAttribute(HIGHLIGHT_ID_ATTRIBUTE_NAME, this.id);
		return element;
	}

	updateDOM(): boolean {
		return false;
	}

	excludeFromCopy() {
		return false;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement(HIGHLIGHT_TAG_NAME);
		element.classList.add(HIGHLIGHT_CSS_CLASS_NAME);
		element.setAttribute(HIGHLIGHT_ID_ATTRIBUTE_NAME, this.id);
		return { element };
	}

	static importDOM(): null {
		return {
			highlight: () => {
				return {
					conversion: (element: HTMLElement) => {
						const id = element.getAttribute(
							HIGHLIGHT_ID_ATTRIBUTE_NAME,
						);
						return { node: $createHighlightNode(id ?? undefined) };
					},
					priority: 0,
				};
			},
			// This is necessary due to the return type of MarkNode super class.
		} as unknown as null;
	}

	static getType(): string {
		return HIGHLIGHT_TAG_NAME;
	}
}

export function $createHighlightNode(id?: string): HighlightNode {
	const node = new HighlightNode();
	if (id !== undefined) {
		node.id = id;
	}
	return node;
}

export function $isHighlightNode(
	node: LexicalNode | null | undefined,
): node is HighlightNode {
	return node instanceof HighlightNode;
}

export function $isSelectionInsideHighlight(
	selection: RangeSelection,
): boolean {
	return $isSelectionInsideNode(selection, $isHighlightNode);
}

export function $getHighlightFromSelection(selection: RangeSelection) {
	return $getNodesOfTypeFromSelection(selection, $isHighlightNode);
}
