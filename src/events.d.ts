import { READ_POINT_MANUAL_SET_REQUESTED } from "./types/events/readPointManualSetRequestedEvent";
import { READ_POINT_MANUAL_CLEAR_REQUESTED } from "./types/events/readPointManualClearRequestedEvent";
import { READ_POINT_MANUAL_GOTO_REQUESTED } from "./types/events/readPointManualGotoRequestedEvent";
import { PRIORITY_CHANGED } from "./types/events/priorityChangedEvent";
import { STUDY_SESSION_SETTINGS_CHANGED } from "./types/events/studySessionSettingsChangedEvent";

declare global {
	interface WindowEventMap {
		[READ_POINT_MANUAL_SET_REQUESTED]: Event;
		[READ_POINT_MANUAL_CLEAR_REQUESTED]: Event;
		[READ_POINT_MANUAL_GOTO_REQUESTED]: Event;
		[PRIORITY_CHANGED]: Event;
		[STUDY_SESSION_SETTINGS_CHANGED]: Event;
	}
}

export {};
