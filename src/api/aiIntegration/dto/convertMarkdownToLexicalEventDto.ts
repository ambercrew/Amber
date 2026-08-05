import { FrontendRequestEvent } from "../../../hooks/useFrontendRequestBridge";

/** Wire shape of the `convert-markdown-to-lexical` request bridge event (src-tauri/src/common/services/implementations/tauri_lexical_json_converter.rs). */
interface ConvertMarkdownToLexicalEventDto extends FrontendRequestEvent {
	markdown: string;
}

export default ConvertMarkdownToLexicalEventDto;
