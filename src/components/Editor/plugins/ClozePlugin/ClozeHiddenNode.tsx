import {
	$applyNodeReplacement,
	type DOMConversionMap,
	type DOMConversionOutput,
	type EditorConfig,
	type LexicalNode,
} from "lexical";
import { MarkNode, type SerializedMarkNode } from "@lexical/mark";
import styles from "./ClozeHiddenNode.module.css";

export const CLOZE_HIDDEN_TAG_NAME = "mark";
export const CLOZE_HIDDEN_ATTRIBUTE = "data-cloze-hidden";

function applyClozeHiddenAttributes(element: HTMLElement) {
	element.classList.add(styles["cloze-hidden"]);
	element.setAttribute(CLOZE_HIDDEN_ATTRIBUTE, "true");
}

// MarkNode's static importDOM() is typed to always return null (it never
// round-trips through HTML); ClozeHiddenNode intentionally returns a real
// DOMConversionMap so cloze placeholders survive this app's HTML-based
// persistence, mirroring HighlightNode.
// @ts-expect-error -- static-side variance on importDOM(), see comment above
export class ClozeHiddenNode extends MarkNode {
	static getType(): string {
		return "cloze-hidden";
	}

	static clone(node: ClozeHiddenNode): ClozeHiddenNode {
		return new ClozeHiddenNode(node.__ids, node.__key);
	}

	createDOM(config: EditorConfig): HTMLElement {
		const element = super.createDOM(config);
		applyClozeHiddenAttributes(element);
		return element;
	}

	updateDOM(
		prevNode: this,
		element: HTMLElement,
		config: EditorConfig,
	): boolean {
		super.updateDOM(prevNode, element, config);
		applyClozeHiddenAttributes(element);
		return false;
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

	static importJSON(serialized: SerializedMarkNode): ClozeHiddenNode {
		return $createClozeHiddenNode(serialized.ids).updateFromJSON(
			serialized,
		);
	}

	excludeFromCopy(): boolean {
		return false;
	}
}

function $convertClozeHiddenElement(
	_element: HTMLElement,
): DOMConversionOutput {
	return { node: $createClozeHiddenNode([]) };
}

export function $createClozeHiddenNode(
	ids: readonly string[],
): ClozeHiddenNode {
	return $applyNodeReplacement(new ClozeHiddenNode(ids));
}

export function $isClozeHiddenNode(
	node: LexicalNode | null | undefined,
): node is ClozeHiddenNode {
	return node instanceof ClozeHiddenNode;
}
