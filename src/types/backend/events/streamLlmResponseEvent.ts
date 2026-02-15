import Chat from "../entity/chat";

export type StreamLlmResponseEvent =
	| {
			event: "inProgress";
			data: string;
	  }
	| {
			event: "finished";
	  }
	| {
			event: "error";
			data: string;
	  }
	| {
			event: "createdChat";
			data: Chat;
	  };
