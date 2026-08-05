import { CONVERT_MARKDOWN_TO_LEXICAL_EVENT } from "../../../api/aiIntegration/api/aiApi";
import ConvertMarkdownToLexicalEventDto from "../../../api/aiIntegration/dto/convertMarkdownToLexicalEventDto";
import { markdownToLexicalJson } from "../../../components/Editor/lexicalJsonConversion";
import { useFrontendRequestBridge } from "../../../hooks/useFrontendRequestBridge";

/**
 * Answers the backend's Markdown-to-Lexical-JSON conversion requests: the AI
 * flashcard tool has no Lexical schema implementation of its own, so it asks
 * the frontend's headless editor to do the conversion.
 */
export function useLexicalConversionBridge() {
	useFrontendRequestBridge<ConvertMarkdownToLexicalEventDto>(
		CONVERT_MARKDOWN_TO_LEXICAL_EVENT,
		event => markdownToLexicalJson(event.markdown),
	);
}
