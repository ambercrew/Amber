import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	BLUR_COMMAND,
	COMMAND_PRIORITY_LOW,
	FOCUS_COMMAND,
	LexicalEditor,
} from "lexical";
import { useEffect } from "react";

interface Props {
	onFocus?: (editor: LexicalEditor) => void;
	onBlur?: () => void;
}

export default function FocusBlurPlugin({ onFocus, onBlur }: Props) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		const unregisterFocusListener = editor.registerCommand(
			FOCUS_COMMAND,
			() => {
				if (onFocus) onFocus(editor);
				return false;
			},
			COMMAND_PRIORITY_LOW,
		);

		const unregisterBlurListener = editor.registerCommand(
			BLUR_COMMAND,
			() => {
				if (onBlur) onBlur();
				return false;
			},
			COMMAND_PRIORITY_LOW,
		);

		return () => {
			unregisterFocusListener();
			unregisterBlurListener();
		};
	}, [editor, onFocus, onBlur]);

	return null;
}
