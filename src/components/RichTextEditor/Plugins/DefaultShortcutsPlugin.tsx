import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	COMMAND_PRIORITY_NORMAL,
	FORMAT_TEXT_COMMAND,
	KEY_DOWN_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { TOGGLE_LIST } from "./ListCommandsPluginHandler/CustomListCommands";

export default function DefaultShortcutPlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		return editor.registerCommand(
			KEY_DOWN_COMMAND,
			event => {
				const { ctrlKey, metaKey, shiftKey, key, code } = event;

				if ((ctrlKey || metaKey) && shiftKey && code === "Equal") {
					event.preventDefault();
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript");
					return true;
				}

				if ((ctrlKey || metaKey) && key === "=") {
					event.preventDefault();
					editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript");
					return true;
				}

				if ((ctrlKey || metaKey) && key === ",") {
					event.preventDefault();
					editor.dispatchCommand(TOGGLE_LIST, "bullet");
					return true;
				}

				if ((ctrlKey || metaKey) && key === ".") {
					event.preventDefault();
					editor.dispatchCommand(TOGGLE_LIST, "number");
					return true;
				}

				return false;
			},
			COMMAND_PRIORITY_NORMAL,
		);
	}, [editor]);

	return null;
}
