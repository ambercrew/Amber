import { useMemo } from "react";
import {
	AutoFocusExtension,
	ClickAfterLastBlockExtension,
	SelectBlockExtension,
	TabIndentationExtension,
} from "@lexical/extension";
import { CodeShikiExtension, ShikiTokenizer } from "@lexical/code-shiki";
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
import {
	Box,
	ScrollArea,
	Text,
	Typography,
	useComputedColorScheme,
} from "@mantine/core";
import { SlashMenuPlugin } from "./plugins/SlashMenuPlugin";
import { EquationNode } from "./plugins/EquationPlugin/EquationNode";
import { EquationPlugin } from "./plugins/EquationPlugin/EquationPlugin";
import { HighlightNode } from "./plugins/HighlightPlugin/HighlightNode";
import { HighlightPlugin } from "./plugins/HighlightPlugin/HighlightPlugin";
import { HighlightCreatedPayload } from "./plugins/HighlightPlugin/highlightCommands";
import { ClozeHiddenNode } from "./plugins/ClozePlugin/ClozeHiddenNode";
import { ImageNode } from "./plugins/ImagePlugin/ImageNode";
import { ImagePlugin } from "./plugins/ImagePlugin/ImagePlugin";
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

// Content saved by the editor itself is serialized Lexical JSON, but content
// coming from the Import feature (`src/features/Import`) is sanitized HTML
// stored directly on the element. Both are valid `initialContent` values, so
// this tells them apart to pick the right parsing path.
function isSerializedEditorState(content: string): boolean {
	const isJson = content.startsWith("{") && content.endsWith("}");
	return isJson;
}

// @lexical/code-shiki bakes the Shiki theme used at highlight time into
// each CodeNode's serialized JSON, and only re-highlights with the
// tokenizer's current `defaultTheme` when a node has none set. Without
// this, code blocks saved under one color scheme would keep rendering
// with that scheme's colors forever, even after switching themes.
function stripCodeNodeThemes(json: string): string {
	return JSON.stringify(
		JSON.parse(json),
		(key: string, value: unknown): unknown =>
			key === "theme" ? undefined : value,
	);
}

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
	onHighlightCreated?: (payload: HighlightCreatedPayload) => void;
}

export default function Editor({
	initialContent,
	autoFocus = false,
	children,
	onHighlightCreated,
}: EditorProps) {
	const colorScheme = useComputedColorScheme("light");

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
					configExtension(CodeShikiExtension, {
						// Only keeping it to get code block background color.
						disabled: true,
					}),
					configExtension(AutoFocusExtension, {
						defaultSelection: "rootStart",
						disabled: !autoFocus,
					}),
				],
				theme: {
					tableScrollableWrapper: styles["table-scrollable-wrapper"],
					tableCellHeader: styles["table-cell-header"],
					text: {
						code: styles["inline-code"],
					},
					code: styles["code-block"],
				},
				name: "editor",
				namespace: "editor",
				nodes: [
					EquationNode,
					HighlightNode,
					ClozeHiddenNode,
					ImageNode,
				],
				$initialEditorState: !initialContent
					? undefined
					: isSerializedEditorState(initialContent)
						? stripCodeNodeThemes(initialContent)
						: htmlToEditorState(initialContent),
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only apply initialContent/autoFocus once, at editor creation; colorScheme is the one prop allowed to rebuild the editor, so code blocks re-highlight with the matching Shiki theme
		[colorScheme],
	);

	return (
		<Typography>
			<LexicalExtensionComposer
				extension={editorExtension}
				contentEditable={null}>
				<Box className={styles.anchor}>
					<ScrollArea h="100%">
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
					</ScrollArea>
					<SlashMenuPlugin />
					<EquationPlugin />
					<ImagePlugin />
					<HighlightPlugin onHighlightCreated={onHighlightCreated} />
					{children}
				</Box>
			</LexicalExtensionComposer>
		</Typography>
	);
}
