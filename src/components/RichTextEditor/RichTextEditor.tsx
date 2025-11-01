import styles from "./styles.module.css";
import { JSX } from "react";
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
import { IFloatingMenuButton } from "./Plugins/FloatingMenuPlugin/FloatingMenuButton";
import DefaultShortcutPlugin from "./Plugins/DefaultShortcutsPlugin";
import ListCommandsPluginHandler from "./Plugins/ListCommandsPluginHandler/ListCommandsPluginHandler";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";

interface IProps {
	content: string;
	title?: string;
	extraNodes?: Klass<LexicalNode>[];
	additionalFloatingMenuButtons?: IFloatingMenuButton[];
	plugins?: JSX.Element[];
	autofocus?: boolean;
	onChange: (html: string) => void;
	onFocus?: (editor: LexicalEditor) => void;
	onBlur?: () => void;
}

export default function RichTextEditor({
	title,
	content,
	extraNodes,
	additionalFloatingMenuButtons,
	autofocus,
	plugins,
	onChange,
	onFocus,
	onBlur,
}: IProps) {
	const initialConfig: InitialConfigType = {
		namespace: "BrainyEditor",
		onError: console.error,
		nodes: [ListNode, ListItemNode, ...(extraNodes ?? [])],
		theme: {
			text: {
				// Global class names in index.xml.
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
			onChange(html);
		});
	};

	return (
		<>
			{title && <p className={styles.title}>{title}</p>}
			<div className={styles.container}>
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
					<OnChangePlugin onChange={handleChange} />
					<FloatingMenuPlugin
						additionalFloatingMenuButtons={
							additionalFloatingMenuButtons
						}
					/>
					{autofocus && <AutoFocusPlugin />}
					<ListPlugin />
					<ListCommandsPluginHandler />
					<FocusBlurPlugin onFocus={onFocus} onBlur={onBlur} />
					<DefaultShortcutPlugin />
					{plugins}
				</LexicalComposer>
			</div>
		</>
	);
}
