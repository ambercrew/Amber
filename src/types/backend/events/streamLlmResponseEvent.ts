import Chat from "../entity/chat";
import Message from "../entity/message";

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
