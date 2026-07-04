import { ReactNode } from "react";
import { AppDispatch, RootState } from "../stores/store";

export const SPOTLIGHT_SHORTCUT = "mod+K";

export const commandIds = [] as const;
export type CommandId = (typeof commandIds)[number];

export const commandGroups = [] as const;
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

export const commands: Command[] = [];
