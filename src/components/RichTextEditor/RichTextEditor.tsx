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
	$getRoot,
	EditorState,
	LexicalNode,
	Klass,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { FloatingMenuButtonProps } from "./Plugins/FloatingMenuPlugin/FloatingMenuButton";
import DefaultShortcutPlugin from "./Plugins/DefaultShortcutsPlugin";
import ListCommandsPluginHandler from "./Plugins/ListCommandsPluginHandler/ListCommandsPluginHandler";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ImagePlugin } from "./Plugins/ImagePlugin/ImagePlugin";
import ImageNode from "./Plugins/ImagePlugin/ImageNode";

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
	onChange: (html: string) => void;
	onFocus?: (editor: LexicalEditor) => void;
	onBlur?: () => void;
}

export default function RichTextEditor({ ...props }: Props) {
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
			<div className={styles.container}>
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
		nodes: [ListNode, ListItemNode, ImageNode, ...(extraNodes ?? [])],
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
			const nodes = $generateNodesFromDOM(editor, dom);
			$getRoot().append(...nodes);
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
			<FocusBlurPlugin onFocus={onFocus} onBlur={onBlur} />
			<DefaultShortcutPlugin />
			{plugins}
		</LexicalComposer>
	);
}
