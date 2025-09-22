import {
	mdiFormatBold,
	mdiFormatItalic,
	mdiFormatListBulleted,
	mdiFormatListNumbered,
	mdiFormatSubscript,
	mdiFormatSuperscript,
	mdiFormatUnderline,
} from "@mdi/js";
import { Command } from "./Command";

export const defaultCommands: Command[] = [
	{
		name: "bold",
		title: "Bold (Ctrl + B)",
		icon: mdiFormatBold,
		onClick: c => c.toggleBold(),
	},
	{
		name: "italic",
		title: "Italic (Ctrl + I)",
		icon: mdiFormatItalic,
		onClick: c => c.toggleItalic(),
	},
	{
		name: "underline",
		title: "Underline (Ctrl + U)",
		icon: mdiFormatUnderline,
		onClick: c => c.toggleUnderline(),
	},
	{
		name: "orderedList",
		title: "Ordered list (Ctrl + Shift + 7)",
		icon: mdiFormatListNumbered,
		onClick: c => c.toggleOrderedList(),
	},
	{
		name: "bulletList",
		title: "Bullet list (Ctrl + Shift + 8)",
		icon: mdiFormatListBulleted,
		onClick: c => c.toggleBulletList(),
	},
	{
		name: "subscript",
		title: "Subscript (Ctrl + ,)",
		icon: mdiFormatSubscript,
		onClick: c => c.toggleSubscript(),
	},
	{
		name: "superscript",
		title: "Superscript (Ctrl + .)",
		icon: mdiFormatSuperscript,
		onClick: c => c.toggleSuperscript(),
	},
];
