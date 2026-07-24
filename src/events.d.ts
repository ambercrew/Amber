import {
	ELEMENT_CREATED,
	ElementCreatedPayload,
} from "./types/events/elementCreatedEvent";
import { READ_POINT_MANUAL_SET_REQUESTED } from "./types/events/readPointManualSetRequestedEvent";
import { READ_POINT_MANUAL_CLEAR_REQUESTED } from "./types/events/readPointManualClearRequestedEvent";

declare global {
	interface WindowEventMap {
		[ELEMENT_CREATED]: CustomEvent<ElementCreatedPayload>;
		[READ_POINT_MANUAL_SET_REQUESTED]: Event;
		[READ_POINT_MANUAL_CLEAR_REQUESTED]: Event;
	}
}

export {};
