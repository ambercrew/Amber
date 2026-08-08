import { useMemo } from "react";
import { useNavigate } from "react-router";
import {
	CardsIcon,
	ScissorsIcon,
	EraserIcon,
	ArrowSquareOutIcon,
} from "@phosphor-icons/react";
import {
	$getSelection,
	$isRangeSelection,
	LexicalNode,
	RangeSelection,
} from "lexical";
import { $unwrapMarkNode } from "@lexical/mark";
import { FloatingMenuItem } from "../../components/Editor/plugins/FloatingMenuPlugin";
import { CREATE_HIGHLIGHT_COMMAND } from "../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import {
	$isHighlightNode,
	HighlightNode,
} from "../../components/Editor/plugins/HighlightPlugin/HighlightNode";
import { paths } from "../../paths";

export const CLOZE_COLOR = "blue";

function $getHighlightNodeFromSelection(selection: RangeSelection) {
	for (const node of selection.getNodes()) {
		let current: LexicalNode | null = node;
		while (current !== null) {
			if ($isHighlightNode(current)) return current;
			current = current.getParent();
		}
	}
	return null;
}

function $getHighlightNodesFromSelection(selection: RangeSelection) {
	const highlightNodes = new Map<string, HighlightNode>();
	for (const node of selection.getNodes()) {
		let current: LexicalNode | null = node;
		while (current !== null) {
			if ($isHighlightNode(current)) {
				highlightNodes.set(current.getKey(), current);
				break;
			}
			current = current.getParent();
		}
	}
	return Array.from(highlightNodes.values());
}

function $isClozeHighlight(selection: RangeSelection): boolean {
	return (
		$getHighlightNodeFromSelection(selection)?.getColor() === CLOZE_COLOR
	);
}

export function useElementViewerButtons(): FloatingMenuItem[] {
	const navigate = useNavigate();

	return useMemo<FloatingMenuItem[]>(
		() => [
			// Create a yellow (extract) or blue (cloze) highlight.
			{
				name: "extract",
				title: "Create Extract",
				label: "Extract",
				Icon: ScissorsIcon,
				showLabel: true,
				isActive: () => false,
				onClick: editor => {
					editor.dispatchCommand(CREATE_HIGHLIGHT_COMMAND, "yellow");
				},
			},
			{
				name: "cloze",
				title: "Create Cloze",
				label: "Cloze",
				showLabel: true,
				Icon: CardsIcon,
				isActive: () => false,
				onClick: editor => {
					editor.dispatchCommand(
						CREATE_HIGHLIGHT_COMMAND,
						CLOZE_COLOR,
					);
				},
			},
			{ name: "create-highlight-divider", divider: true },
			// Acts on the highlight (if any) under the current selection.
			{
				name: "open-highlight",
				title: "Open",
				Icon: ArrowSquareOutIcon,
				isActive: () => false,
				isVisible: selection =>
					!!$getHighlightNodeFromSelection(selection),
				onClick: editor => {
					editor.getEditorState().read(() => {
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) return;
						const highlightNode =
							$getHighlightNodeFromSelection(selection);
						if (highlightNode) {
							void navigate(
								paths.element(
									$isClozeHighlight(selection)
										? "card"
										: "extract",
									highlightNode.getHighlightId(),
								),
							);
						}
					});
				},
			},
			{
				name: "remove-highlight",
				title: "Remove Highlight",
				Icon: EraserIcon,
				color: "red",
				isActive: () => false,
				isVisible: selection =>
					!!$getHighlightNodeFromSelection(selection),
				onClick: editor => {
					editor.update(() => {
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) return;
						for (const highlightNode of $getHighlightNodesFromSelection(
							selection,
						)) {
							$unwrapMarkNode(highlightNode);
						}
					});
				},
			},
		],
		[navigate],
	);
}
