import { createCommand, type LexicalCommand } from "lexical";
import type { ImagePayload } from "./ImageNode";

export const INSERT_IMAGE_COMMAND: LexicalCommand<ImagePayload> = createCommand(
	"INSERT_IMAGE_COMMAND",
);
