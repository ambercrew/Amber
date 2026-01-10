import { JSX } from "react";
import { DecoratorNode, NodeKey, DOMExportOutput, LexicalNode } from "lexical";
import ImageComponent from "./ImageComponent";

interface SerializedImageNode {
	src: string;
	width: number;
	height: number;
	type: "image";
	version: 1;
}

export default class ImageNode extends DecoratorNode<JSX.Element> {
	src: string;
	width: number;
	height: number;

	constructor(key: NodeKey | undefined = undefined) {
		super(key);
		this.src = "";
		this.width = 0;
		this.height = 0;
	}

	static clone(node: ImageNode) {
		const clone = $createImageNode({
			src: node.src,
			width: node.width,
			height: node.height,
		});
		clone.__key = node.__key;
		return clone;
	}

	createDOM() {
		const div = document.createElement("div");
		return div;
	}

	updateDOM() {
		return false;
	}

	excludeFromCopy() {
		return false;
	}

	setWidthAndHeight(width: number, height: number) {
		const writable = this.getWritable();
		writable.width = width;
		writable.height = height;
	}

	decorate() {
		return (
			<ImageComponent
				src={this.src}
				width={this.width}
				height={this.height}
				nodeKey={this.getKey()}
			/>
		);
	}

	exportDOM(): DOMExportOutput {
		const element = document.createElement("img");
		element.setAttribute("src", this.src);
		element.setAttribute("width", String(this.width));
		element.setAttribute("height", String(this.height));
		return { element };
	}

	static importDOM(): null {
		return {
			img: () => {
				return {
					conversion: (element: HTMLElement) => {
						const width = Number(element.getAttribute("width")!);
						const height = Number(element.getAttribute("height")!);
						const src = element.getAttribute("src")!;
						return {
							node: $createImageNode({
								width,
								height,
								src,
							}),
						};
					},
					priority: 0,
				};
			},
			// This is necessary due to the return type of MarkNode super class.
		} as unknown as null;
	}

	exportJSON(): SerializedImageNode {
		return {
			src: this.src,
			width: this.width,
			height: this.height,
			type: "image",
			version: 1,
		};
	}

	static importJSON(serializedNode: SerializedImageNode): ImageNode {
		const { src, width, height } = serializedNode;
		return $createImageNode({ src, width, height });
	}

	static getType() {
		return "image";
	}
}

export function $createImageNode({
	height,
	src,
	width,
}: {
	height: number;
	src: string;
	width: number;
}) {
	const node = new ImageNode();
	node.src = src;
	node.height = height;
	node.width = width;
	return node;
}

export function $isImageNode(
	node: LexicalNode | null | undefined,
): node is ImageNode {
	return node instanceof ImageNode;
}
