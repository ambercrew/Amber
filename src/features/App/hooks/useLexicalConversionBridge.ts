import ConvertMarkdownToLexicalEventDto, {
	CONVERT_MARKDOWN_TO_LEXICAL_EVENT,
} from "../../../api/common/events/convertMarkdownToLexicalEvent";
import { markdownToLexicalJson } from "../../../components/Editor/lexicalJsonConversion";
import { useFrontendRequestBridge } from "../../../hooks/useFrontendRequestBridge";

/**
 * Answers the backend's Markdown-to-Lexical-JSON conversion requests.
 */
export function useLexicalConversionBridge() {
	useFrontendRequestBridge<ConvertMarkdownToLexicalEventDto>(
		CONVERT_MARKDOWN_TO_LEXICAL_EVENT,
		event => markdownToLexicalJson(event.markdown),
	);
}
