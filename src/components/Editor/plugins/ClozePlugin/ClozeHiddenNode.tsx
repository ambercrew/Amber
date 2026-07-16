import type { JSX } from "react";
import {
	$applyNodeReplacement,
	DecoratorNode,
	type DOMConversionMap,
	type DOMConversionOutput,
	type DOMExportOutput,
	type LexicalNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread,
} from "lexical";
import styles from "./ClozeHiddenNode.module.css";

export type SerializedClozeHiddenNode = Spread<
	{ text: string },
	SerializedLexicalNode
>;

export const CLOZE_HIDDEN_TAG_NAME = "mark";
export const CLOZE_HIDDEN_ATTRIBUTE = "data-cloze-hidden";

// A cloze-hidden span renders as a literal, static "[...]" placeholder — the
// real text is kept as node data (not as editable DOM text) purely so it can
// be read back out for other purposes (e.g. seeding a nested cloze). Using a
// DecoratorNode instead of an editable text/mark node makes the placeholder
// a single atomic unit for the caret, clicks, and arrow keys, the same way
// EquationNode/ImageNode behave.
export class ClozeHiddenNode extends DecoratorNode<JSX.Element> {
	__text: string;

	static getType(): string {
		return "cloze-hidden";
	}

	static clone(node: ClozeHiddenNode): ClozeHiddenNode {
		return new ClozeHiddenNode(node.__text, node.__key);
	}

	constructor(text = "", key?: NodeKey) {
		super(key);
		this.__text = text;
	}

	createDOM(): HTMLElement {
		return document.createElement("span");
	}

	updateDOM(): boolean {
		return false;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement(CLOZE_HIDDEN_TAG_NAME);
		element.setAttribute(CLOZE_HIDDEN_ATTRIBUTE, "true");
		element.textContent = this.__text;
		return { element };
	}

	static importDOM(): DOMConversionMap | null {
		return {
			[CLOZE_HIDDEN_TAG_NAME]: node => {
				if (
					!(node instanceof HTMLElement) ||
					!node.hasAttribute(CLOZE_HIDDEN_ATTRIBUTE)
				) {
					return null;
				}
				return {
					conversion: $convertClozeHiddenElement,
					priority: 1,
				};
			},
		};
	}

	exportJSON(): SerializedClozeHiddenNode {
		return {
			...super.exportJSON(),
			text: this.__text,
		};
	}

	static importJSON(serialized: SerializedClozeHiddenNode): ClozeHiddenNode {
		return $createClozeHiddenNode(serialized.text);
	}

	getTextContent(): string {
		return this.getLatest().__text;
	}

	isInline(): boolean {
		return true;
	}

	decorate(): JSX.Element {
		return <span className={styles["cloze-hidden"]}>[...]</span>;
	}
}

function $convertClozeHiddenElement(element: HTMLElement): DOMConversionOutput {
	return { node: $createClozeHiddenNode(element.textContent ?? "") };
}

export function $createClozeHiddenNode(text = ""): ClozeHiddenNode {
	return $applyNodeReplacement(new ClozeHiddenNode(text));
}

export function $isClozeHiddenNode(
	node: LexicalNode | null | undefined,
): node is ClozeHiddenNode {
	return node instanceof ClozeHiddenNode;
}
