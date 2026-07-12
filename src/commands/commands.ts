import { createElement, ReactNode } from "react";
import { NavigateFunction } from "react-router";
import { notifications } from "@mantine/notifications";
import {
	BookOpenIcon,
	FadersHorizontalIcon,
	UploadSimpleIcon,
} from "@phosphor-icons/react";
import { AppDispatch, RootState } from "../stores/store";
import {
	openImportModal,
	openStudyProfileModal,
} from "../stores/app/appReducer";
import { startStudySession } from "../stores/study/studyActions";
import { sessionStopped } from "../stores/study/studyReducer";
import { selectStudyStatus } from "../stores/study/studySelectors";

export const SPOTLIGHT_SHORTCUT = "mod+K";
export const IMPORT_SHORTCUT = "mod+shift+N";
export const TOGGLE_STUDY_SESSION_SHORTCUT = "mod+L";

export const commandIds = [
	"import",
	"manage-study-profiles",
	"toggle-study-session",
] as const;
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
	execute: (
		dispatch: AppDispatch,
		getState: () => RootState,
		navigate: NavigateFunction,
	) => void;
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
	{
		id: "toggle-study-session",
		group: "General",
		label: state =>
			selectStudyStatus(state) === "studying"
				? "Stop studying"
				: "Start studying",
		shortcut: TOGGLE_STUDY_SESSION_SHORTCUT,
		icon: createElement(BookOpenIcon),
		execute: (dispatch, getState, navigate) => {
			if (selectStudyStatus(getState()) === "studying") {
				dispatch(sessionStopped());
				return;
			}
			void dispatch(startStudySession(navigate)).then(started => {
				if (!started) notifications.show({ message: "Nothing due" });
			});
		},
	},
];
