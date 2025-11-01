import { DOMExportOutput, LexicalNode, NodeKey, RangeSelection } from "lexical";
import { MarkNode } from "@lexical/mark";

const CLOZE_CSS_CLASS_NAME = "cloze-node";
const CLOZE_INDEX_ATTRIBUTE_NAME = "index";
const CLOZE_TAG_NAME = "cloze";

export class ClozeNode extends MarkNode {
	index: number;

	constructor(key: NodeKey | undefined = undefined) {
		super(undefined, key);
		this.index = 1;
	}

	canInsertTextBefore() {
		return true as unknown as false;
	}

	canInsertTextAfter() {
		return true as unknown as false;
	}

	static clone(node: ClozeNode): MarkNode {
		const clone = $createClozeNode(node.index);
		clone.__key = node.__key;
		return clone;
	}

	createDOM(): HTMLElement {
		const element = document.createElement(CLOZE_TAG_NAME);
		element.classList.add(CLOZE_CSS_CLASS_NAME);
		element.setAttribute(CLOZE_INDEX_ATTRIBUTE_NAME, this.index.toString());
		return element;
	}

	updateDOM(): boolean {
		return false;
	}

	excludeFromCopy() {
		return false;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement(CLOZE_TAG_NAME);
		element.classList.add(CLOZE_CSS_CLASS_NAME);
		element.setAttribute(CLOZE_INDEX_ATTRIBUTE_NAME, this.index.toString());
		return { element };
	}

	static importDOM(): null {
		return {
			cloze: () => {
				return {
					conversion: (element: HTMLElement) => {
						const index = element.getAttribute(
							CLOZE_INDEX_ATTRIBUTE_NAME,
						);
						return { node: $createClozeNode(Number(index)) };
					},
					priority: 0,
				};
			},
			// This is necessary due to the return type of MarkNode super class.
		} as unknown as null;
	}

	static getType(): string {
		return CLOZE_TAG_NAME;
	}
}

export function $createClozeNode(index: number): ClozeNode {
	const cloze = new ClozeNode();
	cloze.index = index;
	return cloze;
}

export function $isClozeNode(
	node: LexicalNode | null | undefined,
): node is ClozeNode {
	return node instanceof ClozeNode;
}

export function $isSelectionInsideCloze(selection: RangeSelection): boolean {
	let allCloze = true;
	for (const node of selection.getNodes()) {
		let anyCloze = false;
		let current = node.getParent();
		while (current !== null) {
			anyCloze = anyCloze || $isClozeNode(current);
			current = current.getParent();
		}
		allCloze = allCloze && anyCloze;
	}

	return allCloze;
}
