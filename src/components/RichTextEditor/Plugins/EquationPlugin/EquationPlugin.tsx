import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TextNode } from "lexical";
import { useEffect } from "react";
import { $createEquationNode, EquationNode } from "./EquationNode";

const EQUATION_REGEX = /\$([^$\n]+)\$/;

function $transformTextToEquation(node: TextNode) {
	const text = node.getTextContent();
	const match = EQUATION_REGEX.exec(text);
	if (!match) return;

	const [fullMatch, equation] = match;
	const start = match.index;
	const end = start + fullMatch.length;

	if (start == 0 && end < text.length) {
		const parts = node.splitText(end);
		parts[0].replace($createEquationNode(equation));
	} else if (start > 0 || end < text.length) {
		const parts = node.splitText(start, end);
		parts[1].replace($createEquationNode(equation));
	} else {
		node.replace($createEquationNode(equation));
	}
}

export default function EquationPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([EquationNode])) {
			throw new Error(
				"EquationPlugin: EquationNode not registered in editor",
			);
		}
		return editor.registerNodeTransform(TextNode, $transformTextToEquation);
	}, [editor]);

	return null;
}
