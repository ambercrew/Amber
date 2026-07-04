import {
	ELEMENT_CREATED,
	ElementCreatedPayload,
} from "./types/events/elementCreatedEvent";

declare global {
	interface WindowEventMap {
		[ELEMENT_CREATED]: CustomEvent<ElementCreatedPayload>;
	}
}

export {};
