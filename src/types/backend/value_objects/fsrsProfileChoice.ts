export interface FsrsProfileChoiceInherit {
	type: "inherit";
}

export interface FsrsProfileChoiceId {
	type: "id";
	content: string;
}

export type FsrsProfileChoice = FsrsProfileChoiceInherit | FsrsProfileChoiceId;
