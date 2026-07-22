import { useState } from "react";
import { Divider, Stack, Text, TextInput, TagsInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import useAppSelector from "../../../hooks/useAppSelector";
import useAppDispatch from "../../../hooks/useAppDispatch";
import { selectCurrentElement } from "../../../stores/elements/elementsSelectors";
import { updateElementTags } from "../../../api/elements/api/elementsApi";
import { renameElementAction } from "../../../stores/elements/elementsActions";
import { ElementId } from "../../../types/elements/elementId";
import ElementProfileRow from "../../Study/components/ElementProfileRow";
import InfoField from "./InfoField";
import InfoGroup from "./InfoGroup";
import ReviewDetails from "./ReviewDetails";

function ElementInfoPanel() {
	const currentElement = useAppSelector(selectCurrentElement);
	const storedMeta = currentElement?.data.meta ?? null;
	const dispatch = useAppDispatch();
	const [dueState, setDueState] = useState<string | null>(null);

	const debouncedRename = useDebouncedCallback(
		async (id: ElementId, name: string) => {
			if (!name) return;
			await dispatch(renameElementAction(id, name));
		},
		500,
	);

	const debouncedUpdateTags = useDebouncedCallback(
		(id: ElementId, tags: string[]) => updateElementTags(id, tags),
		500,
	);

	if (!storedMeta) {
		return (
			<Text size="sm" c="dimmed" ta="center" px="md" py="xl">
				Select an element to see its details.
			</Text>
		);
	}

	return (
		<Stack gap="lg" px="md" py="sm">
			<InfoGroup title="Details" storageKey="details">
				<InfoField label="Name">
					<TextInput
						key={`name-${storedMeta.elementId.id}`}
						size="sm"
						defaultValue={storedMeta.name}
						onChange={e =>
							debouncedRename(
								storedMeta.elementId,
								e.currentTarget.value,
							)
						}
					/>
				</InfoField>
				<InfoField label="Tags">
					<TagsInput
						key={`tags-${storedMeta.elementId.id}`}
						placeholder="Enter tag"
						size="sm"
						defaultValue={storedMeta.tags.map(t => t.name)}
						onChange={tags =>
							debouncedUpdateTags(storedMeta.elementId, tags)
						}
					/>
				</InfoField>
				<InfoField label="Created">
					<Text size="sm">
						{new Date(storedMeta.createdAt).toLocaleString()}
					</Text>
				</InfoField>
			</InfoGroup>

			<Divider />

			<InfoGroup title="Study" storageKey="study">
				<InfoField label="Study profile">
					<ElementProfileRow
						elementId={storedMeta.elementId}
						parentId={storedMeta.parent}
						onDueChange={setDueState}
					/>
				</InfoField>
				<InfoField label="Due">
					<Text size="sm">{dueState ?? "—"}</Text>
				</InfoField>
			</InfoGroup>

			{currentElement &&
				(currentElement.type === "card" ||
					currentElement.type === "reading" ||
					currentElement.type === "extract") && (
					<>
						<Divider />
						<ReviewDetails element={currentElement} />
					</>
				)}
		</Stack>
	);
}

export default ElementInfoPanel;
