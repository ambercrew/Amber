import { useMemo, useState } from "react";
import {
	AutoFocusExtension,
	ClickAfterLastBlockExtension,
	SelectBlockExtension,
	TabIndentationExtension,
} from "@lexical/extension";
import { $generateNodesFromDOM } from "@lexical/html";
import { HistoryExtension } from "@lexical/history";
import { ListExtension } from "@lexical/list";
import { TableExtension } from "@lexical/table";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { RichTextExtension } from "@lexical/rich-text";
import {
	$createParagraphNode,
	$getRoot,
	$isDecoratorNode,
	$isElementNode,
	configExtension,
	defineExtension,
	LexicalEditor,
} from "lexical";
import { Box, Text, Typography } from "@mantine/core";
import { DragPlugin } from "./plugins/DragPlugin";
import { SlashMenuPlugin } from "./plugins/SlashMenuPlugin";
import { EquationNode } from "./plugins/EquationPlugin/EquationNode";
import { EquationPlugin } from "./plugins/EquationPlugin/EquationPlugin";
import styles from "./Editor.module.css";

const blockTags = new Set([
	"P",
	"DIV",
	"H1",
	"H2",
	"H3",
	"H4",
	"H5",
	"H6",
	"UL",
	"OL",
	"LI",
	"BLOCKQUOTE",
	"TABLE",
	"TR",
	"TD",
	"TH",
	"PRE",
	"FIGURE",
]);

function htmlToEditorState(html: string) {
	return (editor: LexicalEditor) => {
		const parser = new DOMParser();
		const dom = parser.parseFromString(html, "text/html");

		// If the content has no block-level elements, wrap everything in a
		// single <p> so Lexical doesn't create a separate paragraph per
		// inline node (spans, links, etc.).
		const hasBlock = Array.from(dom.body.children).some(el =>
			blockTags.has(el.tagName),
		);
		if (!hasBlock && dom.body.childNodes.length > 0) {
			const p = dom.createElement("p");
			while (dom.body.firstChild) p.appendChild(dom.body.firstChild);
			dom.body.appendChild(p);
		}

		const nodes = $generateNodesFromDOM(editor, dom);
		const root = $getRoot();

		// Used to avoid the following error:
		// Only element or decorator nodes can be inserted in to the root node.
		nodes.forEach(node => {
			if ($isElementNode(node) || $isDecoratorNode(node)) {
				root.append(node);
			} else {
				const textContent = node.getTextContent().trim();
				if (textContent !== "") {
					const paragraph = $createParagraphNode();
					paragraph.append(node);
					root.append(paragraph);
				}
			}
		});
	};
}

interface EditorProps {
	initialContent?: string;
	autoFocus?: boolean;
	children?: React.ReactNode;
}

export default function Editor({
	initialContent,
	autoFocus = false,
	children,
}: EditorProps) {
	const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);

	const editorExtension = useMemo(
		() =>
			defineExtension({
				dependencies: [
					RichTextExtension,
					HistoryExtension,
					ListExtension,
					TableExtension,
					TabIndentationExtension,
					ClickAfterLastBlockExtension,
					SelectBlockExtension,
					configExtension(AutoFocusExtension, {
						disabled: !autoFocus,
					}),
				],
				name: "editor",
				namespace: "editor",
				nodes: [EquationNode],
				$initialEditorState: initialContent
					? htmlToEditorState(initialContent)
					: undefined,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only apply initialContent once, at editor creation
		[],
	);

	return (
		<Typography>
			<LexicalExtensionComposer
				extension={editorExtension}
				contentEditable={null}>
				<Box className={styles.anchor} ref={setAnchorElem}>
					<ContentEditable
						className={styles["content-editable"]}
						aria-label="Rich text editor"
						aria-placeholder="Type '/' for commands..."
						placeholder={
							<Text className={styles.placeholder} c="dimmed">
								Type &apos;/&apos; for commands...
							</Text>
						}
					/>
					<SlashMenuPlugin />
					<EquationPlugin />
					{anchorElem ? <DragPlugin anchorElem={anchorElem} /> : null}
					{children}
				</Box>
			</LexicalExtensionComposer>
		</Typography>
	);
}
