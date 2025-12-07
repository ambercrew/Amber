import {
	mdiFormatBold,
	mdiFormatItalic,
	mdiFormatListBulleted,
	mdiFormatListNumbered,
	mdiFormatSubscript,
	mdiFormatSuperscript,
	mdiFormatUnderline,
} from "@mdi/js";
import { FORMAT_TEXT_COMMAND } from "lexical";
import { $isListNode } from "@lexical/list";
import { FloatingMenuButtonProps } from "./FloatingMenuButton";
import { TOGGLE_LIST } from "../ListCommandsPluginHandler/CustomListCommands";

export const defaultButtons: FloatingMenuButtonProps[] = [
	{
		name: "bold",
		title: "Bold (Ctrl + B)",
		icon: mdiFormatBold,
		onClick: editor => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"),
		isActive: selection => selection.hasFormat("bold"),
	},
	{
		name: "italic",
		title: "Italic (Ctrl + I)",
		icon: mdiFormatItalic,
		onClick: editor =>
			editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"),
		isActive: selection => selection.hasFormat("italic"),
	},
	{
		name: "underline",
		title: "Underline (Ctrl + U)",
		icon: mdiFormatUnderline,
		onClick: editor =>
			editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline"),
		isActive: selection => selection.hasFormat("underline"),
	},
	{
		name: "bulletList",
		title: "Bullet list (Ctrl + ,)",
		icon: mdiFormatListBulleted,
		onClick: editor => editor.dispatchCommand(TOGGLE_LIST, "bullet"),
		isActive: selection => {
			for (const node of selection.getNodes()) {
				let current = node.getParent();
				while (current !== null) {
					if (
						$isListNode(current) &&
						current.getListType() === "bullet"
					) {
						return true;
					}
					current = current.getParent();
				}
			}
			return false;
		},
	},
	{
		name: "orderedList",
		title: "Ordered list (Ctrl + .)",
		icon: mdiFormatListNumbered,
		onClick: editor => editor.dispatchCommand(TOGGLE_LIST, "number"),
		isActive: selection => {
			for (const node of selection.getNodes()) {
				let current = node.getParent();
				while (current !== null) {
					if (
						$isListNode(current) &&
						current.getListType() === "number"
					) {
						return true;
					}
					current = current.getParent();
				}
			}
			return false;
		},
	},
	{
		name: "superscript",
		title: "Superscript (Ctrl + =)",
		icon: mdiFormatSuperscript,
		onClick: editor =>
			editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript"),
		isActive: selection => selection.hasFormat("superscript"),
	},
	{
		name: "subscript",
		title: "Subscript (Ctrl + Shift + =)",
		icon: mdiFormatSubscript,
		onClick: editor =>
			editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript"),
		isActive: selection => selection.hasFormat("subscript"),
	},
];
