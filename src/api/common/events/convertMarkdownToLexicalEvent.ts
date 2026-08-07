import { FrontendRequestEvent } from "../../../hooks/useFrontendRequestBridge";

export const CONVERT_MARKDOWN_TO_LEXICAL_EVENT = "convert-markdown-to-lexical";

interface ConvertMarkdownToLexicalEventDto extends FrontendRequestEvent {
	markdown: string;
}

export default ConvertMarkdownToLexicalEventDto;
