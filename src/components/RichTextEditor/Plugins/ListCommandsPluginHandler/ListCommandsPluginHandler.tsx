import { useEffect } from "react";
import {
	$insertList,
	$isListNode,
	$removeList,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$getSelection,
	$isRangeSelection,
	COMMAND_PRIORITY_LOW,
} from "lexical";
import { TOGGLE_LIST } from "./CustomListCommands";

export default function ListCommandsPluginHandler() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		const unregisterListeners: (() => void)[] = [];
		unregisterListeners.push(
			editor.registerCommand(
				INSERT_UNORDERED_LIST_COMMAND,
				() => {
					$insertList("bullet");
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		);

		unregisterListeners.push(
			editor.registerCommand(
				INSERT_ORDERED_LIST_COMMAND,
				() => {
					$insertList("number");
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		);

		unregisterListeners.push(
			editor.registerCommand(
				REMOVE_LIST_COMMAND,
				() => {
					$removeList();
					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		);

		unregisterListeners.push(
			editor.registerCommand(
				TOGGLE_LIST,
				type => {
					const selection = $getSelection();
					if (!$isRangeSelection(selection)) return true;

					for (const node of selection.getNodes()) {
						let current = node.getParent();
						while (current !== null) {
							if ($isListNode(current)) {
								editor.dispatchCommand(
									REMOVE_LIST_COMMAND,
									undefined,
								);
								// Only return if type the same, if not switch with the new type.
								if (current.getListType() === type) return true;
								break;
							}
							current = current.getParent();
						}
					}

					editor.dispatchCommand(
						type === "bullet"
							? INSERT_UNORDERED_LIST_COMMAND
							: INSERT_ORDERED_LIST_COMMAND,
						undefined,
					);

					return true;
				},
				COMMAND_PRIORITY_LOW,
			),
		);

		return () => {
			for (const unregisterListener of unregisterListeners) {
				unregisterListener();
			}
		};
	}, [editor]);

	return null;
}
