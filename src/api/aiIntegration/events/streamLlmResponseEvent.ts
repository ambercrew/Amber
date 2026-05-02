import Chat from "../entities/chat";
import Message from "../entities/message";

export type StreamLlmResponseEvent =
	| {
			event: "inProgress";
			data: string;
	  }
	| {
			event: "error";
			data: string;
	  }
	| {
			event: "createdChat";
			data: Chat;
	  }
	| {
			event: "toolCalled";
			data: Message;
	  };
