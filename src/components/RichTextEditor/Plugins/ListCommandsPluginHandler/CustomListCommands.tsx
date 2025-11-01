import { createCommand, LexicalCommand } from "lexical";

export const TOGGLE_LIST: LexicalCommand<"bullet" | "number"> = createCommand();
