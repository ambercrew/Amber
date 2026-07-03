import { useCallback } from "react";
import { $generateHtmlFromNodes } from "@lexical/html";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { EditorState, LexicalEditor } from "lexical";
import Editor from "../../components/Editor/Editor";
import {
	FloatingMenuButton,
	FloatingMenuPlugin,
} from "../../components/Editor/plugins/FloatingMenuPlugin";
import { HighlightCreatedPayload } from "../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import useApi from "../../hooks/useApi";
import useAutoSave from "./hooks/useAutoSave";

interface ElementEditorProps {
	initialContent: string;
	buttons: FloatingMenuButton[];
	autoFocus?: boolean;
	onHighlightCreated?: (payload: HighlightCreatedPayload) => void;
	onChange: (content: string) => Promise<void>;
}

export default function ElementEditor({
	initialContent,
	buttons,
	autoFocus,
	onHighlightCreated,
	onChange,
}: ElementEditorProps) {
	// TODO: show error message
	const { callApi } = useApi();
	const { onContentUpdate } = useAutoSave({
		onSave: onChange,
		callApi,
	});

	const handleChange = useCallback(
		(editorState: EditorState, editor: LexicalEditor) => {
			editorState.read(() => {
				const content = $generateHtmlFromNodes(editor);
				if (content !== initialContent) onContentUpdate(content);
			});
		},
		[onContentUpdate, initialContent],
	);

	return (
		<Editor
			initialContent={initialContent}
			autoFocus={autoFocus}
			onHighlightCreated={onHighlightCreated}>
			<FloatingMenuPlugin buttons={buttons} />
			<OnChangePlugin
				onChange={handleChange}
				ignoreSelectionChange
				ignoreHistoryMergeTagChange
			/>
		</Editor>
	);
}
