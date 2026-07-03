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
import { FloatingMenuButton } from "../../components/Editor/plugins/FloatingMenuPlugin";
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

function $isExtractHighlight(selection: RangeSelection): boolean {
	const highlightNode = $getHighlightNodeFromSelection(selection);
	return !!highlightNode && highlightNode.getColor() !== CLOZE_COLOR;
}

export function useElementViewerButtons(): FloatingMenuButton[] {
	const navigate = useNavigate();

	return useMemo<FloatingMenuButton[]>(
		() => [
			{
				name: "extract",
				title: "Create Extract",
				Icon: ScissorsIcon,
				isActive: () => false,
				onClick: editor => {
					editor.dispatchCommand(CREATE_HIGHLIGHT_COMMAND, "yellow");
				},
			},
			{
				name: "remove-highlight",
				title: "Remove Highlight",
				Icon: EraserIcon,
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
			{
				name: "open-extract",
				title: "Open Extract",
				Icon: ArrowSquareOutIcon,
				isActive: () => false,
				isVisible: selection => $isExtractHighlight(selection),
				onClick: editor => {
					editor.getEditorState().read(() => {
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) return;
						const highlightNode =
							$getHighlightNodeFromSelection(selection);
						if (highlightNode) {
							void navigate(
								paths.element(
									"extract",
									highlightNode.getHighlightId(),
								),
							);
						}
					});
				},
			},
			{
				name: "cloze",
				title: "Create Cloze",
				Icon: CardsIcon,
				isActive: () => false,
				onClick: editor => {
					editor.dispatchCommand(
						CREATE_HIGHLIGHT_COMMAND,
						CLOZE_COLOR,
					);
				},
			},
			{
				name: "open-cloze",
				title: "Open Cloze",
				Icon: ArrowSquareOutIcon,
				isActive: () => false,
				isVisible: selection => $isClozeHighlight(selection),
				onClick: editor => {
					editor.getEditorState().read(() => {
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) return;
						const highlightNode =
							$getHighlightNodeFromSelection(selection);
						if (highlightNode) {
							void navigate(
								paths.element(
									"card",
									highlightNode.getHighlightId(),
								),
							);
						}
					});
				},
			},
		],
		[navigate],
	);
}
