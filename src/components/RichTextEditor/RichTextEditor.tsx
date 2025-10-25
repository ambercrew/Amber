import {
	BubbleMenu,
	useEditor,
	EditorContent,
	AnyExtension,
	Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import styles from "./styles.module.css";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import ImageResize from "tiptap-extension-resize-image";
import BubbleMenuCommand, { Command } from "./Command";
import { defaultCommands } from "./defaultCommands";
import { useEffect, useState } from "react";

const extensions = [
	StarterKit,
	ImageResize.configure({
		allowBase64: true,
	}),
	Underline,
	Subscript,
	Superscript,
];

interface Props {
	content: string;
	title?: string;
	extraExtensions?: AnyExtension[];
	commands?: Command[];
	autofocus?: boolean;
	/** TiptapEditor is slow on rendering, therefor showing a div element
	 * instead until there is a need to render the actual editor (e.g. user interaction).
	 */
	eagerLoadRichTextEditor: boolean;
	onUpdate: (html: string) => void;
	onFocus?: (editor: Editor) => void;
	onBlur?: () => void;
}

function RichTextEditor({
	eagerLoadRichTextEditor: initialEagerLoadEditor,
	...props
}: Props) {
	const [showTiptapEditor, setShowTiptapEditor] = useState(
		initialEagerLoadEditor,
	);

	useEffect(() => {
		if (initialEagerLoadEditor) setShowTiptapEditor(true);
	}, [initialEagerLoadEditor]);

	return (
		<>
			{props.title && <p className={styles.title}>{props.title}</p>}
			<div className={styles.innerEditor}>
				{showTiptapEditor && <TiptapEditor {...props} />}
				{!showTiptapEditor && (
					<div className={`${styles.editor}`}>
						<div
							tabIndex={0}
							dangerouslySetInnerHTML={{
								// Setting white space if content is empty so that the height is correct.
								__html: props.content
									? props.content
									: "&nbsp;",
							}}
							onMouseEnter={() => setShowTiptapEditor(true)}
							onFocus={() => setShowTiptapEditor(true)}
						/>
					</div>
				)}
			</div>
		</>
	);
}

interface TiptapEditorProps {
	content: string;
	title?: string;
	extraExtensions?: AnyExtension[];
	commands?: Command[];
	autofocus?: boolean;
	onUpdate: (html: string) => void;
	onFocus?: (editor: Editor) => void;
	onBlur?: () => void;
}

function TiptapEditor({
	content,
	extraExtensions,
	commands,
	autofocus,
	onUpdate,
	onFocus,
	onBlur,
}: TiptapEditorProps) {
	const editor = useEditor(
		{
			extensions: [...extensions, ...(extraExtensions ?? [])],
			content: content,
			onUpdate: e => {
				if (e.editor.getHTML() !== content)
					onUpdate(e.editor.getHTML());
			},
			onFocus: onFocus ? e => onFocus(e.editor) : undefined,
			onBlur,
			editorProps: {
				handleKeyDown: (_, e) => {
					// Do not insert new lines when clicking Ctrl + Enter.
					if (e.ctrlKey && e.key === "Enter") {
						return true;
					}
					return false;
				},
				transformPastedText(text) {
					return text.trim();
				},
			},
		},
		[],
	);

	useEffect(() => {
		if (autofocus && editor) editor.commands.focus();
	}, [autofocus, editor]);

	return (
		<>
			{editor && (
				<BubbleMenu
					editor={editor}
					tippyOptions={{ duration: 100 }}
					className={styles.bubbleMenu}>
					{commands?.map(c => (
						<BubbleMenuCommand
							key={c.name}
							command={c}
							editor={editor}
						/>
					))}
					{commands && commands.length > 0 && (
						<div className={styles.verticalBorder} />
					)}

					{defaultCommands.map(c => (
						<BubbleMenuCommand
							key={c.name}
							command={c}
							editor={editor}
						/>
					))}
				</BubbleMenu>
			)}
			<EditorContent editor={editor} className={styles.editor} />
		</>
	);
}

export default RichTextEditor;
