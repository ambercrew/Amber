import { Container } from "@mantine/core";
import ContentSourcePanel from "./ContentSourcePanel";
import ElementEditor from "./ElementEditor";
import { ExtractResponseDto } from "../../api/elements/dto/anyElementDto";
import { FloatingMenuItem } from "../../components/Editor/plugins/FloatingMenuPlugin";
import { HighlightCreatedPayload } from "../../components/Editor/plugins/HighlightPlugin/highlightCommands";
import { ElementId } from "../../types/elements/elementId";
import { useEditorFindInPage } from "./hooks/useEditorFindInPage";

const EXTRACT_EDITOR_KEYS = ["extract"];

interface ExtractElementViewerProps {
	elementId: ElementId;
	extract: ExtractResponseDto;
	buttons: FloatingMenuItem[];
	autoFocus: boolean;
	onChange: (content: string) => Promise<void>;
	onHighlightCreated?: (payload: HighlightCreatedPayload) => void;
}

export default function ExtractElementViewer({
	elementId,
	extract,
	buttons,
	autoFocus,
	onChange,
	onHighlightCreated,
}: ExtractElementViewerProps) {
	const { query, caseSensitive, onMatches, matchIndexFor } =
		useEditorFindInPage(EXTRACT_EDITOR_KEYS);

	return (
		<Container size="sm" py="lg">
			<ElementEditor
				key={`extract-${elementId.id}`}
				initialContent={extract.content}
				buttons={buttons}
				onChange={onChange}
				onHighlightCreated={onHighlightCreated}
				autoFocus={autoFocus}
				search={{
					editorKey: "extract",
					query,
					caseSensitive,
					currentMatchLocalIndex: matchIndexFor("extract"),
					onMatches,
				}}
			/>
			<ContentSourcePanel meta={extract.meta} />
		</Container>
	);
}
