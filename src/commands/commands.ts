import { createElement, ReactNode } from "react";
import { FadersHorizontalIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { AppDispatch, RootState } from "../stores/store";
import {
	openImportModal,
	openStudyProfileModal,
} from "../stores/app/appReducer";

export const SPOTLIGHT_SHORTCUT = "mod+K";
export const IMPORT_SHORTCUT = "mod+shift+N";

export const commandIds = ["import", "manage-study-profiles"] as const;
export type CommandId = (typeof commandIds)[number];

export const commandGroups = ["General"] as const;
export type CommandGroup = (typeof commandGroups)[number];

export interface Command {
	id: CommandId;
	group: CommandGroup;
	label: string | ((state: RootState) => string);
	shortcut?: string; // useHotkeys format: 'mod+L', 'mod+shift+P', 'alt+ArrowUp'
	icon?: ReactNode;
	enabled?: (state: RootState) => boolean;
	execute: (dispatch: AppDispatch, getState: () => RootState) => void;
}

export const commands: Command[] = [
	{
		id: "import",
		group: "General",
		label: "Import",
		shortcut: IMPORT_SHORTCUT,
		icon: createElement(UploadSimpleIcon),
		execute: dispatch => dispatch(openImportModal()),
	},
	{
		id: "manage-study-profiles",
		group: "General",
		label: "Manage study profiles",
		icon: createElement(FadersHorizontalIcon),
		execute: dispatch => dispatch(openStudyProfileModal()),
	},
];
