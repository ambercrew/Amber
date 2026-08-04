import { Group, Pill, Tooltip } from "@mantine/core";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { selectAiContextSnippets } from "../../../stores/aiContext/aiContextSelectors";
import { removeAiContextSnippet } from "../../../stores/aiContext/aiContextReducer";

const PREVIEW_LENGTH = 30;

function previewText(text: string) {
	const trimmed = text.trim();
	return trimmed.length > PREVIEW_LENGTH
		? `${trimmed.slice(0, PREVIEW_LENGTH)}…`
		: trimmed;
}

function AiContextSnippets() {
	const snippets = useAppSelector(selectAiContextSnippets);
	const dispatch = useAppDispatch();

	if (snippets.length === 0) return null;

	return (
		<Group gap="xs" py="xs" wrap="wrap">
			{snippets.map(snippet => (
				<Tooltip key={snippet.id} label={snippet.text} multiline>
					<Pill
						size="lg"
						withRemoveButton
						onRemove={() =>
							dispatch(removeAiContextSnippet(snippet.id))
						}
						removeButtonProps={{
							"aria-label": "Remove context",
						}}>
						{previewText(snippet.text)}
					</Pill>
				</Tooltip>
			))}
		</Group>
	);
}

export default AiContextSnippets;
