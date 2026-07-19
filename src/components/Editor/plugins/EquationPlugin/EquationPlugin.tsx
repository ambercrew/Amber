import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TextNode } from "lexical";
import { useEffect } from "react";
import { $createEquationNode, EquationNode } from "./EquationNode";

// Requires the content to start and end on a non-space character, so plain
// prose mentioning two dollar amounts (e.g. "costs $5 and $10 more") isn't
// misread as an equation — real inline math never has whitespace touching
// the delimiters.
const EQUATION_REGEX = /\$(\S(?:[^$\n]*\S)?)\$/;

function $transformTextToEquation(node: TextNode) {
	const text = node.getTextContent();
	const match = EQUATION_REGEX.exec(text);
	if (!match) return;

	const [fullMatch, equation] = match;
	const start = match.index;
	const end = start + fullMatch.length;

	if (start === 0 && end < text.length) {
		const parts = node.splitText(end);
		parts[0].replace($createEquationNode(equation));
	} else if (start > 0 || end < text.length) {
		const parts = node.splitText(start, end);
		parts[1].replace($createEquationNode(equation));
	} else {
		node.replace($createEquationNode(equation));
	}
}

export function EquationPlugin() {
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
