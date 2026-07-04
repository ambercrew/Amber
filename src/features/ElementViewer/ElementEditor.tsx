import { useCallback } from "react";
import { Alert } from "@mantine/core";
import { $generateHtmlFromNodes } from "@lexical/html";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { EditorState, LexicalEditor } from "lexical";
import Editor from "../../components/Editor/Editor";
import {
	FloatingMenuItem,
	FloatingMenuPlugin,
} from "../../components/Editor/plugins/FloatingMenuPlugin";
import { HighlightCreatedPayload } from "../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import useApi from "../../hooks/useApi";
import useAutoSave from "./hooks/useAutoSave";

interface ElementEditorProps {
	initialContent: string;
	buttons: FloatingMenuItem[];
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
	const { callApi, errorMessage, clearErrorMessage } = useApi();
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
		<>
			{errorMessage && (
				<Alert
					color="red"
					title={errorMessage}
					withCloseButton
					onClose={clearErrorMessage}
					mb="sm"
				/>
			)}
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
		</>
	);
}
