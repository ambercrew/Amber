import styles from "./styles.module.css";
import { JSX, useState } from "react";
import {
	InitialConfigType,
	LexicalComposer,
} from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { FloatingMenuPlugin } from "./Plugins/FloatingMenuPlugin/FloatingMenuPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { ListItemNode, ListNode } from "@lexical/list";
import FocusBlurPlugin from "./Plugins/FocusBlurPlugin";
import {
	LexicalEditor,
	EditorState,
	LexicalNode,
	Klass,
	$isElementNode,
	$isDecoratorNode,
	$createParagraphNode,
	$getRoot,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { FloatingMenuButtonProps } from "./Plugins/FloatingMenuPlugin/FloatingMenuButton";
import DefaultShortcutPlugin from "./Plugins/DefaultShortcutsPlugin";
import ListCommandsPluginHandler from "./Plugins/ListCommandsPluginHandler/ListCommandsPluginHandler";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ImagePlugin } from "./Plugins/ImagePlugin/ImagePlugin";
import ImageNode from "./Plugins/ImagePlugin/ImageNode";
import EquationPlugin from "./Plugins/EquationPlugin/EquationPlugin";
import { EquationNode } from "./Plugins/EquationPlugin/EquationNode";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";

interface Props {
	content: string;
	title?: string;
	extraNodes?: Klass<LexicalNode>[];
	additionalFloatingMenuButtons?: FloatingMenuButtonProps[];
	plugins?: JSX.Element[];
	autofocus?: boolean;
	/* The rich text editor might be slow to render, therefore a temporally div
	 * is shown until the real editor is needed to be rendered, e.g.
	 * the editor is focused or this property is true.
	 */
	eagerLoadRichTextEditor: boolean;
	containerClassName?: string;
	onChange: (html: string) => void;
	onFocus?: (editor: LexicalEditor) => void;
	onBlur?: () => void;
}

export default function RichTextEditor({
	containerClassName,
	...props
}: Props) {
	const [showEditor, setShowEditor] = useState(props.eagerLoadRichTextEditor);
	const [
		previousEagerLoadRichTextEditor,
		setPreviousEagerLoadRichTextEditor,
	] = useState<boolean | null>(null);

	if (
		previousEagerLoadRichTextEditor !== props.eagerLoadRichTextEditor &&
		!showEditor
	) {
		setPreviousEagerLoadRichTextEditor(props.eagerLoadRichTextEditor);
		if (props.eagerLoadRichTextEditor) setShowEditor(true);
	}

	return (
		<>
			{props.title && <p className={styles.title}>{props.title}</p>}
			<div className={`${styles.container} ${containerClassName}`}>
				{showEditor && <Editor {...props} />}
				{!showEditor && (
					<div className={`${styles.editor}`}>
						<div
							tabIndex={0}
							dangerouslySetInnerHTML={{
								// Setting white space if content is empty so that the height is correct.
								__html: props.content
									? props.content
									: "&nbsp;",
							}}
							onMouseOver={() => setShowEditor(true)}
							onFocus={() => setShowEditor(true)}
						/>
					</div>
				)}
			</div>
		</>
	);
}

function Editor({
	content,
	extraNodes,
	additionalFloatingMenuButtons,
	autofocus,
	plugins,
	onChange,
	onFocus,
	onBlur,
}: Props) {
	const initialConfig: InitialConfigType = {
		namespace: "BrainyEditor",
		onError: console.error,
		nodes: [
			ListNode,
			ListItemNode,
			ImageNode,
			EquationNode,
			LinkNode,
			AutoLinkNode,
			TableNode,
			TableCellNode,
			TableRowNode,
			...(extraNodes ?? []),
		],
		theme: {
			text: {
				// Global class names in index.css.
				underline: "underline",
				bold: "bold",
				italic: "italic",
			},
		},
		editorState: editor => {
			const parser = new DOMParser();
			const dom = parser.parseFromString(content, "text/html");

			// If the content has no block-level elements, wrap everything in a
			// single <p> so Lexical doesn't create a separate paragraph per
			// inline node (spans, links, etc.).
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
		},
	};

	const handleChange = (editorState: EditorState, editor: LexicalEditor) => {
		editorState.read(() => {
			const html = $generateHtmlFromNodes(editor);
			if (html !== content) onChange(html);
		});
	};

	return (
		<LexicalComposer initialConfig={initialConfig}>
			<RichTextPlugin
				contentEditable={
					<ContentEditable
						className={styles.editor}
						aria-placeholder={"Enter some text..."}
						placeholder={<></>}
					/>
				}
				ErrorBoundary={LexicalErrorBoundary}
			/>
			<HistoryPlugin />
			<OnChangePlugin
				onChange={handleChange}
				ignoreSelectionChange={true}
				ignoreHistoryMergeTagChange={true}
			/>
			<FloatingMenuPlugin
				additionalFloatingMenuButtons={additionalFloatingMenuButtons}
			/>
			{autofocus && <AutoFocusPlugin />}
			<ListPlugin />
			<ListCommandsPluginHandler />
			<ImagePlugin />
			<EquationPlugin />
			<LinkPlugin />
			<TablePlugin />
			<FocusBlurPlugin onFocus={onFocus} onBlur={onBlur} />
			<DefaultShortcutPlugin />
			{plugins}
		</LexicalComposer>
	);
}
