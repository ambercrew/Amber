import {
	$getSelection,
	$isRangeSelection,
	$nodesOfType,
	COMMAND_PRIORITY_EDITOR,
	COMMAND_PRIORITY_NORMAL,
	createCommand,
	KEY_DOWN_COMMAND,
	LexicalCommand,
	RangeSelection,
} from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import {
	$createClozeNode,
	$isSelectionInsideCloze,
	$isClozeNode,
	ClozeNode,
} from "./clozeNode";
import { isModKey } from "../../../utils/keyboardUtils";
import {
	$wrapSelectionInNode,
	$removeSelectionFromNode,
} from "../../../components/RichTextEditor/Plugins/utils/selectionWrapUtils";

export const TOGGLE_CLOZE_NODE: LexicalCommand<void> = createCommand();
export const INCREASE_CLOZE_GROUP_NUMBER: LexicalCommand<void> =
	createCommand();
export const DECREASE_CLOZE_GROUP_NUMBER: LexicalCommand<void> =
	createCommand();

export function ClozePlugin() {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (!editor.hasNodes([ClozeNode])) {
			throw new Error("ClozeNode not registered on editor");
		}

		const unregisterToggleCloze = editor.registerCommand(
			TOGGLE_CLOZE_NODE,
			() => {
				editor.update(() => {
					const selection = $getSelection();
					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed()
					) {
						return;
					}

					if ($isSelectionInsideCloze(selection)) {
						$removeSelectionFromCloze(selection);
					} else {
						$wrapSelectionInCloze(selection);
					}
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);

		const unregisterIncreaseGroupNumber = editor.registerCommand(
			INCREASE_CLOZE_GROUP_NUMBER,
			() => {
				editor.update(() => {
					const selection = $getSelection();

					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed()
					) {
						return;
					}

					const cloze = $wrapSelectionInCloze(selection);
					cloze.index++;
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);

		const unregisterDecreaseGroupNumber = editor.registerCommand(
			DECREASE_CLOZE_GROUP_NUMBER,
			() => {
				editor.update(() => {
					const selection = $getSelection();

					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed()
					) {
						return;
					}

					const cloze = $wrapSelectionInCloze(selection);
					cloze.index = Math.max(cloze.index - 1, 1);
				});
				return true;
			},
			COMMAND_PRIORITY_EDITOR,
		);

		const unregisterKeyDown = editor.registerCommand(
			KEY_DOWN_COMMAND,
			event => {
				const { shiftKey, key } = event;

				if (isModKey(event) && shiftKey && key.toLowerCase() === "c") {
					event.preventDefault();
					editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined);
					return true;
				}

				return false;
			},
			COMMAND_PRIORITY_NORMAL,
		);

		return () => {
			unregisterToggleCloze();
			unregisterIncreaseGroupNumber();
			unregisterDecreaseGroupNumber();
			unregisterKeyDown();
		};
	}, [editor]);

	return null;
}

function $getHighestClozeIndex(): number {
	const nodes = $nodesOfType(ClozeNode);
	return nodes.reduce((max, n) => Math.max(max, n.index), 1);
}

function $wrapSelectionInCloze(selection: RangeSelection): ClozeNode {
	return $wrapSelectionInNode(selection, $isClozeNode, existing =>
		$createClozeNode(existing?.index ?? $getHighestClozeIndex()),
	);
}

function $removeSelectionFromCloze(selection: RangeSelection) {
	$removeSelectionFromNode(selection, $isClozeNode, existing =>
		$createClozeNode(existing.index),
	);
}
