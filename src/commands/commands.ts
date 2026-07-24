import { createElement, ReactNode } from "react";
import { NavigateFunction } from "react-router";
import { notifications } from "@mantine/notifications";
import {
	BookOpenIcon,
	BookmarkSimpleIcon,
	EraserIcon,
	FadersHorizontalIcon,
	GearIcon,
	MoonIcon,
	UploadSimpleIcon,
} from "@phosphor-icons/react";
import { AppDispatch, RootState } from "../stores/store";
import {
	openImportModal,
	openSettingsModal,
	openStudyProfileModal,
} from "../stores/app/appReducer";
import { startStudySession } from "../stores/study/studyActions";
import { sessionStopped } from "../stores/study/studyReducer";
import { selectStudyStatus } from "../stores/study/studySelectors";
import { saveSettings } from "../stores/settings/settingsActions";
import { buildUpdateSettingsRequest } from "../api/settings/models/updateSettingsRequest";
import { isCurrentlyDark } from "./commandUtils";
import { selectCurrentElement } from "../stores/elements/elementsSelectors";
import { READ_POINT_MANUAL_SET_REQUESTED } from "../types/events/readPointManualSetRequestedEvent";
import { READ_POINT_MANUAL_CLEAR_REQUESTED } from "../types/events/readPointManualClearRequestedEvent";

export const SPOTLIGHT_SHORTCUT = "mod+K";
export const IMPORT_SHORTCUT = "mod+shift+N";
export const TOGGLE_STUDY_SESSION_SHORTCUT = "mod+L";
export const OPEN_SETTINGS_SHORTCUT = "mod+P";
export const SET_READ_POINT_SHORTCUT = "mod+shift+R";

export const commandIds = [
	"import",
	"manage-study-profiles",
	"toggle-study-session",
	"open-settings",
	"toggle-theme",
	"set-read-point",
	"clear-read-point",
] as const;
export type CommandId = (typeof commandIds)[number];

export const commandGroups = [
	"General",
	"Study",
	"Settings",
	"Reading",
] as const;
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
		group: "Study",
		label: "Manage study profiles",
		icon: createElement(FadersHorizontalIcon),
		execute: dispatch => dispatch(openStudyProfileModal()),
	},
	{
		id: "open-settings",
		group: "Settings",
		label: "Open settings",
		shortcut: OPEN_SETTINGS_SHORTCUT,
		icon: createElement(GearIcon),
		execute: dispatch => dispatch(openSettingsModal()),
	},
	{
		id: "toggle-theme",
		group: "Settings",
		label: state =>
			isCurrentlyDark(state)
				? "Switch to light theme"
				: "Switch to dark theme",
		icon: createElement(MoonIcon),
		execute: (dispatch, getState) => {
			const next = isCurrentlyDark(getState()) ? "Light" : "Dark";
			void dispatch(
				saveSettings(buildUpdateSettingsRequest({ theme: next })),
			);
		},
	},
	{
		id: "toggle-study-session",
		group: "Study",
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
	{
		id: "set-read-point",
		group: "Reading",
		label: "Set read point",
		shortcut: SET_READ_POINT_SHORTCUT,
		icon: createElement(BookmarkSimpleIcon),
		enabled: state => selectCurrentElement(state)?.type === "reading",
		execute: () => {
			window.dispatchEvent(new Event(READ_POINT_MANUAL_SET_REQUESTED));
			notifications.show({ message: "Read point set" });
		},
	},
	{
		id: "clear-read-point",
		group: "Reading",
		label: "Clear read point",
		icon: createElement(EraserIcon),
		enabled: state => selectCurrentElement(state)?.type === "reading",
		execute: () => {
			window.dispatchEvent(new Event(READ_POINT_MANUAL_CLEAR_REQUESTED));
			notifications.show({ message: "Read point cleared" });
		},
	},
];
