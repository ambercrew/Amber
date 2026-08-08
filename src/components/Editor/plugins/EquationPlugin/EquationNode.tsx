import type { JSX } from "react";
import {
	$applyNodeReplacement,
	DecoratorNode,
	type DOMExportOutput,
	type LexicalNode,
	type NodeKey,
	type SerializedLexicalNode,
	type Spread,
} from "lexical";
import { render } from "katex";
import EquationComponent from "./EquationComponent";

export type SerializedEquationNode = Spread<
	{ equation: string },
	SerializedLexicalNode
>;

const EQUATION_TAG_NAME = "span";
const EQUATION_ATTRIBUTE_NAME = "data-lexical-equation";

export class EquationNode extends DecoratorNode<JSX.Element> {
	__equation: string;

	static getType(): string {
		return "equation";
	}

	static clone(node: EquationNode): EquationNode {
		return new EquationNode(node.__equation, node.__key);
	}

	constructor(equation = "", key?: NodeKey) {
		super(key);
		this.__equation = equation;
	}

	createDOM(): HTMLElement {
		return document.createElement(EQUATION_TAG_NAME);
	}

	updateDOM(): boolean {
		return false;
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement(EQUATION_TAG_NAME);
		element.setAttribute(EQUATION_ATTRIBUTE_NAME, btoa(this.__equation));
		render(this.__equation, element, {
			displayMode: false,
			throwOnError: false,
			output: "html",
		});
		return { element };
	}

	static importDOM() {
		const convert = (node: Node) => {
			if (
				!(node instanceof HTMLElement) ||
				!node.hasAttribute(EQUATION_ATTRIBUTE_NAME)
			) {
				return null;
			}
			return {
				conversion: $convertEquationElement,
				priority: 0,
			};
		};
		return { [EQUATION_TAG_NAME]: convert } as unknown as null;
	}

	exportJSON(): SerializedEquationNode {
		return {
			...super.exportJSON(),
			equation: this.__equation,
		};
	}

	static importJSON(serialized: SerializedEquationNode): EquationNode {
		return $createEquationNode(serialized.equation);
	}

	getEquation(): string {
		return this.getLatest().__equation;
	}

	setEquation(equation: string): this {
		const writable = this.getWritable();
		writable.__equation = equation;
		return writable;
	}

	getTextContent(): string {
		return `$${this.__equation}$`;
	}

	decorate(): JSX.Element {
		return (
			<EquationComponent
				equation={this.__equation}
				nodeKey={this.__key}
			/>
		);
	}
}

function $convertEquationElement(element: HTMLElement) {
	const encoded = element.getAttribute(EQUATION_ATTRIBUTE_NAME);
	const equation = encoded ? atob(encoded) : "";
	return { node: $createEquationNode(equation) };
}

export function $createEquationNode(equation = ""): EquationNode {
	return $applyNodeReplacement(new EquationNode(equation));
}

export function $isEquationNode(
	node: LexicalNode | null | undefined,
): node is EquationNode {
	return node instanceof EquationNode;
}
