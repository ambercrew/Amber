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
	initialContent: string;
	title?: string;
	extraExtensions?: AnyExtension[];
	commands?: Command[];
	autofocus?: boolean;
	editable: boolean;
	onUpdate: (html: string) => void;
	onFocus?: (editor: Editor) => void;
	onBlur?: () => void;
}

function RichTextEditor({ editable: initialEditable, ...props }: Props) {
	const [editable, setEditable] = useState(initialEditable);

	useEffect(() => {
		if (initialEditable) setEditable(true);
	}, [initialEditable]);

	// TiptapEditor is slow on rendring, therefor showing a div element
	// instead until there is a need to render the editor.
	return (
		<>
			{props.title && <p className={styles.title}>{props.title}</p>}
			<div className={styles.innerEditor}>
				{!initialEditable && !editable && (
					<div className={`${styles.editor}`}>
						<div
							dangerouslySetInnerHTML={{
								__html: props.initialContent,
							}}
							onMouseEnter={() => setEditable(true)}
						/>
					</div>
				)}
				{editable && <TiptapEditor {...props} />}
			</div>
		</>
	);
}

interface TiptapEditorProps {
	initialContent: string;
	title?: string;
	extraExtensions?: AnyExtension[];
	commands?: Command[];
	autofocus?: boolean;
	onUpdate: (html: string) => void;
	onFocus?: (editor: Editor) => void;
	onBlur?: () => void;
}

function TiptapEditor({
	initialContent,
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
			content: initialContent,
			onUpdate: e => {
				if (e.editor.getHTML() !== initialContent)
					onUpdate(e.editor.getHTML());
			},
			onFocus: onFocus ? e => onFocus(e.editor) : undefined,
			onBlur,
			editorProps: {
				handleKeyDown: (_, e) => {
					// Do not insert new lines when clicking Ctrl + Enter.
					if (e.ctrlKey && e.code === "Enter") {
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
