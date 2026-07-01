import { useMemo } from "react";
import { Container } from "@mantine/core";
import { $getSelection, $isRangeSelection } from "lexical";
import { CardsIcon, ScissorsIcon } from "@phosphor-icons/react";
import Editor from "../Editor/Editor";
import {
	FloatingMenuButton,
	FloatingMenuPlugin,
} from "../Editor/plugins/FloatingMenuPlugin";
import { useElementParams } from "../../hooks/useElementParams";
import useAppDispatch from "../../hooks/useAppDispatch";
import { createExtractAction } from "../../stores/elements/elementsActions";
import { defaultElementName } from "../Sidebar/components/ElementTree/elementTreeUtils";

export default function ElementEditor() {
	const elementId = useElementParams();
	const dispatch = useAppDispatch();

	const buttons = useMemo<FloatingMenuButton[]>(
		() => [
			{
				name: "extract",
				title: "Create Extract",
				Icon: ScissorsIcon,
				showLabel: true,
				isActive: () => false,
				onClick: editor => {
					editor.getEditorState().read(() => {
						const selection = $getSelection();
						if (!$isRangeSelection(selection)) return;
						const text = selection.getTextContent();
						if (!text) return;
						// TODO:
						void dispatch(
							createExtractAction({
								meta: {
									name: defaultElementName("Extract"),
									parent: elementId,
								},
								content: text,
							}),
						);
					});
				},
			},
			{
				name: "cloze",
				title: "Create Cloze",
				Icon: CardsIcon,
				showLabel: true,
				isActive: () => false,
				onClick: () => {
					// TODO:
				},
			},
		],
		[dispatch, elementId],
	);

	return (
		<Container size="sm">
			<Editor>
				<FloatingMenuPlugin buttons={buttons} />
			</Editor>
		</Container>
	);
}
