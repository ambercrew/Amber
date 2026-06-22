import {
	DECREASE_CLOZE_GROUP_NUMBER,
	INCREASE_CLOZE_GROUP_NUMBER,
	TOGGLE_CLOZE_NODE,
} from "../plugins/clozePlugin";
import { $isSelectionInsideCloze } from "../plugins/clozeNode";
import {
	mdiDotsHorizontal,
	mdiNumericNegative1,
	mdiNumericPositive1,
} from "@mdi/js";
import { FloatingMenuButtonProps } from "../../../components/RichTextEditor/Plugins/FloatingMenuPlugin/FloatingMenuButton";

export const ClozeFloatingMenuButtons: FloatingMenuButtonProps[] = [
	{
		name: "Toggle Cloze",
		icon: mdiDotsHorizontal,
		title: "Toggle Cloze (Ctrl + Shift + C)",
		onClick: editor => editor.dispatchCommand(TOGGLE_CLOZE_NODE, undefined),
		isActive: $isSelectionInsideCloze,
	},
	{
		name: "Cloze+1",
		icon: mdiNumericPositive1,
		title: "Increase cloze group number",
		onClick: editor =>
			editor.dispatchCommand(INCREASE_CLOZE_GROUP_NUMBER, undefined),
		isActive: () => false,
		isVisible: $isSelectionInsideCloze,
	},
	{
		name: "Cloze-1",
		icon: mdiNumericNegative1,
		title: "Decrease cloze group number",
		onClick: editor =>
			editor.dispatchCommand(DECREASE_CLOZE_GROUP_NUMBER, undefined),
		isActive: () => false,
		isVisible: $isSelectionInsideCloze,
	},
];
